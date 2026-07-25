import { Service, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { PeriodType } from '../../enums/period-type.enum';
import { CachedFundRow, ComparisonCacheService } from './comparison-cache.service';

export interface ByPathsParams {
  pathIds: readonly string[];
  periodTypes: readonly PeriodType[];
  companyIds: readonly number[];
}

export interface ByCompaniesParams {
  companyIds: readonly number[];
  periodTypes: readonly PeriodType[];
  pathIds: readonly string[];
  // The company-scoped fetch below returns a company's funds across every category it
  // operates in, so this is what actually scopes results to the selected category —
  // `pathIds` (the optional secondary filter) is a further narrowing on top of it, not a
  // substitute, since it stays empty until the user explicitly picks specific paths.
  categoryPathIds: readonly string[];
}

export interface MergedPeriodValue {
  periodType: PeriodType;
  value: number | null;
  valuePeriod: number | null;
  isStale: boolean;
}

export interface MergedFundRow {
  fundId: number;
  fundName: string;
  primaryLabel: string;
  values: MergedPeriodValue[];
}

export interface MergedGroup {
  id: string;
  title: string;
  rows: MergedFundRow[];
}

export interface GroupedComparison<T> {
  isLoading: Signal<boolean>;
  isError: Signal<boolean>;
  groups: Signal<T[]>;
}

interface RequestState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  groups: T[];
}

const IDLE_STATE = { status: 'idle' as const, groups: [] };
const LOADING_STATE = { status: 'loading' as const, groups: [] };

/**
 * Comparing several paths/companies across several periods at once means many parallel
 * requests fanned out from one selection (one per path/company × period type, merged
 * client-side into one row per fund) — a genuine multi-source async pipeline, which is
 * why this uses RxJS instead of httpResource. Rows themselves are fetched (and cached)
 * unfiltered by `ComparisonCacheService`; this layer decides, per selection change,
 * whether the needed rows can be derived entirely from the *other* dimension's cache
 * (e.g. by-company rows pooled from already-cached by-path fetches) before falling back
 * to fetching whatever's actually missing, then applies the secondary-dimension filter
 * and groups/merges rows fund-wise across period types.
 */
@Service()
export class ComparisonService {
  private readonly cache = inject(ComparisonCacheService);

  byPathGroups(params: Signal<ByPathsParams>): GroupedComparison<MergedGroup> {
    const state = toSignal(
      toObservable(params).pipe(switchMap((current) => this.resolveByPaths(current))),
      { initialValue: IDLE_STATE as RequestState<MergedGroup> },
    );
    return {
      isLoading: computed(() => state().status === 'loading'),
      isError: computed(() => state().status === 'error'),
      groups: computed(() => state().groups),
    };
  }

  byCompanyGroups(params: Signal<ByCompaniesParams>): GroupedComparison<MergedGroup> {
    const state = toSignal(
      toObservable(params).pipe(switchMap((current) => this.resolveByCompanies(current))),
      { initialValue: IDLE_STATE as RequestState<MergedGroup> },
    );
    return {
      isLoading: computed(() => state().status === 'loading'),
      isError: computed(() => state().status === 'error'),
      groups: computed(() => state().groups),
    };
  }

  private resolveByPaths(params: ByPathsParams): Observable<RequestState<MergedGroup>> {
    if (params.pathIds.length === 0 || params.periodTypes.length === 0) {
      return of(IDLE_STATE);
    }
    const rows$ = this.cache.hasCompanyCoverage(params.companyIds, params.periodTypes)
      ? this.cache.pooledCompanyRows(params.companyIds, params.periodTypes)
      : this.pooledOwnRows(params.pathIds, params.periodTypes, (id, periodType) =>
          this.cache.getPathRows(id, periodType),
        );
    return rows$.pipe(
      map((rows) => ({
        status: 'success' as const,
        groups: this.groupByPath(rows, params.pathIds, params.companyIds),
      })),
      catchError(() => of({ status: 'error' as const, groups: [] })),
      startWith(LOADING_STATE),
    );
  }

  private resolveByCompanies(params: ByCompaniesParams): Observable<RequestState<MergedGroup>> {
    if (params.companyIds.length === 0 || params.periodTypes.length === 0) {
      return of(IDLE_STATE);
    }
    const rows$ = this.cache.hasPathCoverage(params.pathIds, params.periodTypes)
      ? this.cache.pooledPathRows(params.pathIds, params.periodTypes)
      : this.pooledOwnRows(params.companyIds, params.periodTypes, (id, periodType) =>
          this.cache.getCompanyRows(id, periodType),
        );
    return rows$.pipe(
      map((rows) => ({
        status: 'success' as const,
        groups: this.groupByCompany(rows, params.companyIds, params.pathIds, params.categoryPathIds),
      })),
      catchError(() => of({ status: 'error' as const, groups: [] })),
      startWith(LOADING_STATE),
    );
  }

  private pooledOwnRows<TId>(
    ids: readonly TId[],
    periodTypes: readonly PeriodType[],
    fetch: (id: TId, periodType: PeriodType) => Observable<CachedFundRow[]>,
  ): Observable<CachedFundRow[]> {
    const requests = ids.flatMap((id) => periodTypes.map((periodType) => fetch(id, periodType)));
    return forkJoin(requests).pipe(map((batches) => batches.flat()));
  }

  private groupByPath(
    allRows: readonly CachedFundRow[],
    pathIds: readonly string[],
    companyIds: readonly number[],
  ): MergedGroup[] {
    const companyFilter = companyIds.length > 0 ? new Set(companyIds) : null;
    return pathIds.map((pathId) => {
      const rows = allRows.filter(
        (row) => row.pathId === pathId && (!companyFilter || companyFilter.has(row.companyId)),
      );
      return this.buildGroup(
        pathId,
        rows,
        (row) => row.companyName,
        (row) => row.pathLabel,
      );
    });
  }

  private groupByCompany(
    allRows: readonly CachedFundRow[],
    companyIds: readonly number[],
    pathIds: readonly string[],
    categoryPathIds: readonly string[],
  ): MergedGroup[] {
    // The user's explicit path filter is already category-scoped (its options come from
    // the selected category's path list), so it's a strict subset of categoryPathIds when
    // present. When empty, fall back to categoryPathIds itself so a company's funds from
    // *other* categories don't leak into the current category's results.
    const pathFilter = new Set(pathIds.length > 0 ? pathIds : categoryPathIds);
    return companyIds.map((companyId) => {
      const rows = allRows.filter((row) => row.companyId === companyId && pathFilter.has(row.pathId));
      return this.buildGroup(
        String(companyId),
        rows,
        (row) => row.pathLabel,
        (row) => row.companyName,
      );
    });
  }

  private buildGroup(
    id: string,
    rows: readonly CachedFundRow[],
    primaryLabelOf: (row: CachedFundRow) => string,
    titleOf: (row: CachedFundRow) => string,
  ): MergedGroup {
    const byFund = new Map<number, MergedFundRow>();
    for (const row of rows) {
      let fundRow = byFund.get(row.fundId);
      if (!fundRow) {
        fundRow = { fundId: row.fundId, fundName: row.fundName, primaryLabel: primaryLabelOf(row), values: [] };
        byFund.set(row.fundId, fundRow);
      }
      fundRow.values.push({
        periodType: row.periodType,
        value: row.value,
        valuePeriod: row.valuePeriod,
        isStale: row.isStale,
      });
    }
    return { id, title: rows[0] ? titleOf(rows[0]) : id, rows: [...byFund.values()] };
  }
}

import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiPath } from '../../enums/api-path.enum';
import { PeriodType } from '../../enums/period-type.enum';
import { CompareCompanyResponse, ComparePathResponse } from '../../models/compare.model';

export interface CachedFundRow {
  fundId: number;
  fundName: string;
  pathId: string;
  pathLabel: string;
  companyId: number;
  companyName: string;
  periodType: PeriodType;
  value: number | null;
  valuePeriod: number | null;
  isStale: boolean;
}

/**
 * Yield data is immutable for the lifetime of a session (data.gov.il refreshes
 * out-of-band, never live), so a row fetched once for a given (path/company, periodType)
 * is valid for the rest of the session — cached here permanently, never evicted or
 * expired, only ever growing until a full page reload. Always fetches the *unfiltered*
 * response (every company for a path, every path for a company) so a single fetch can
 * serve both same-dimension re-selections and cross-dimension mode switches; secondary
 * filtering happens client-side in `ComparisonService`.
 */
@Service()
export class ComparisonCacheService {
  private readonly httpClient = inject(HttpClient);

  private readonly pathCache = new Map<string, Observable<CachedFundRow[]>>();
  private readonly companyCache = new Map<string, Observable<CachedFundRow[]>>();

  getPathRows(pathId: string, periodType: PeriodType): Observable<CachedFundRow[]> {
    return this.getRows(this.pathCache, `${pathId}:${periodType}`, () => this.fetchPathRows(pathId, periodType));
  }

  getCompanyRows(companyId: number, periodType: PeriodType): Observable<CachedFundRow[]> {
    return this.getRows(this.companyCache, `${companyId}:${periodType}`, () =>
      this.fetchCompanyRows(companyId, periodType),
    );
  }

  hasPathCoverage(pathIds: readonly string[], periodTypes: readonly PeriodType[]): boolean {
    return (
      pathIds.length > 0 &&
      pathIds.every((id) => periodTypes.every((periodType) => this.pathCache.has(`${id}:${periodType}`)))
    );
  }

  hasCompanyCoverage(companyIds: readonly number[], periodTypes: readonly PeriodType[]): boolean {
    return (
      companyIds.length > 0 &&
      companyIds.every((id) => periodTypes.every((periodType) => this.companyCache.has(`${id}:${periodType}`)))
    );
  }

  pooledPathRows(pathIds: readonly string[], periodTypes: readonly PeriodType[]): Observable<CachedFundRow[]> {
    const sources = pathIds.flatMap((id) => periodTypes.map((periodType) => this.pathCache.get(`${id}:${periodType}`)!));
    return sources.length > 0 ? forkJoin(sources).pipe(map((batches) => batches.flat())) : of([]);
  }

  pooledCompanyRows(companyIds: readonly number[], periodTypes: readonly PeriodType[]): Observable<CachedFundRow[]> {
    const sources = companyIds.flatMap((id) =>
      periodTypes.map((periodType) => this.companyCache.get(`${id}:${periodType}`)!),
    );
    return sources.length > 0 ? forkJoin(sources).pipe(map((batches) => batches.flat())) : of([]);
  }

  private getRows(
    cache: Map<string, Observable<CachedFundRow[]>>,
    key: string,
    fetch: () => Observable<CachedFundRow[]>,
  ): Observable<CachedFundRow[]> {
    let cached = cache.get(key);
    if (!cached) {
      // A failed fetch must not poison the cache forever — shareReplay replays errors to
      // late subscribers by default, so drop the entry on error and let the next caller
      // retry instead of permanently replaying a transient failure.
      cached = fetch().pipe(
        catchError((error: unknown) => {
          cache.delete(key);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      cache.set(key, cached);
    }
    return cached;
  }

  private fetchPathRows(pathId: string, periodType: PeriodType): Observable<CachedFundRow[]> {
    const searchParams = new URLSearchParams({ period_type: periodType });
    return this.httpClient
      .get<ComparePathResponse>(
        `${environment.apiBaseUrl}/${ApiPath.Compare}/by-path/${pathId}?${searchParams.toString()}`,
      )
      .pipe(
        map((response) =>
          response.rows.map((row) => ({
            fundId: row.fund_id,
            fundName: row.fund_name,
            pathId: response.path_id,
            pathLabel: response.label,
            companyId: row.company_legal_id,
            companyName: row.company_name,
            periodType,
            value: row.value,
            valuePeriod: row.value_period,
            isStale: row.is_stale,
          })),
        ),
      );
  }

  private fetchCompanyRows(companyId: number, periodType: PeriodType): Observable<CachedFundRow[]> {
    const searchParams = new URLSearchParams({ period_type: periodType });
    return this.httpClient
      .get<CompareCompanyResponse>(
        `${environment.apiBaseUrl}/${ApiPath.Compare}/by-company/${companyId}?${searchParams.toString()}`,
      )
      .pipe(
        map((response) =>
          response.rows.map((row) => ({
            fundId: row.fund_id,
            fundName: row.fund_name,
            pathId: row.path_id,
            pathLabel: row.path_label,
            companyId: response.company_legal_id,
            companyName: response.company_name,
            periodType,
            value: row.value,
            valuePeriod: row.value_period,
            isStale: row.is_stale,
          })),
        ),
      );
  }
}

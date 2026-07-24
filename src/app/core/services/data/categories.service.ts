import { Service, Signal, computed } from '@angular/core';
import { HttpResourceRef, httpResource } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { ApiPath } from '../../enums/api-path.enum';
import { CompaniesResponse } from '../../models/company.model';
import { CategoriesResponse, Category, PathsResponse } from '../../models/taxonomy.model';

@Service()
export class CategoriesService {
  private readonly resource: HttpResourceRef<CategoriesResponse | undefined> =
    httpResource<CategoriesResponse>(() => `${environment.apiBaseUrl}/${ApiPath.Categories}`);

  readonly categories: Signal<Category[]> = computed(() => this.resource.value()?.categories ?? []);
  readonly isLoading: Signal<boolean> = this.resource.isLoading;
  readonly isError: Signal<boolean> = computed(() => this.resource.error() !== undefined);

  pathsResource(
    categoryId: Signal<string | undefined>,
  ): HttpResourceRef<PathsResponse | undefined> {
    return httpResource<PathsResponse>(() => {
      const id = categoryId();
      return id ? `${environment.apiBaseUrl}/${ApiPath.Categories}/${id}/paths` : undefined;
    });
  }

  // Companies with zero funds in this category would otherwise be selectable dead ends
  // in the company filter — scoping the list to the category rules those out up front.
  companiesResource(
    categoryId: Signal<string | undefined>,
  ): HttpResourceRef<CompaniesResponse | undefined> {
    return httpResource<CompaniesResponse>(() => {
      const id = categoryId();
      return id ? `${environment.apiBaseUrl}/${ApiPath.Categories}/${id}/companies` : undefined;
    });
  }
}

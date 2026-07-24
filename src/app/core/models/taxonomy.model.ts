export interface Category {
  id: string;
  label: string;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface InvestmentPath {
  id: string;
  label: string;
}

export interface PathsResponse {
  category_id: string;
  paths: InvestmentPath[];
}

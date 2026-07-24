export interface Company {
  legal_id: number;
  name: string;
}

export interface CompaniesResponse {
  companies: Company[];
}

export interface ComparisonRowByPath {
  fund_id: number;
  fund_name: string;
  company_legal_id: number;
  company_name: string;
  value: number | null;
  value_period: number | null;
  is_stale: boolean;
}

export interface ComparePathResponse {
  path_id: string;
  label: string;
  period_type: string;
  resolved_as_of: number;
  rows: ComparisonRowByPath[];
}

export interface ComparisonRowByCompany {
  path_id: string;
  path_label: string;
  fund_id: number;
  fund_name: string;
  value: number | null;
  value_period: number | null;
  is_stale: boolean;
}

export interface CompareCompanyResponse {
  company_legal_id: number;
  company_name: string;
  period_type: string;
  resolved_as_of: number;
  rows: ComparisonRowByCompany[];
}

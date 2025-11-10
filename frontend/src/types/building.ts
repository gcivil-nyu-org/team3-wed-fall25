// Building-related type definitions

export interface BuildingData {
  bbl: string;
  registration: {
    bbl: string;
    bin: number;
    boro_id: number;
    boro: string;
    block: number;
    lot: number;
    house_number: string;
    street_name: string;
    zip: string;
    community_board: number;
    last_registration_date: string;
    registration_end_date: string;
    registration_id: number;
    building_id: number;
  };
  rent_stabilized: {
    bbl: string;
    borough: string;
    block: number;
    lot: number;
    zip: string;
    city: string;
    status: string;
    source_year: number;
  };
  contacts: Array<{
    registration_contact_id: number;
    registration_id: number;
    type: string;
    contact_description: string;
    first_name: string;
    last_name: string;
    corporation_name: string | null;
    business_house_number: string | null;
    business_street_name: string | null;
    business_city: string | null;
    business_state: string | null;
    business_zip: string | null;
    business_apartment: string | null;
  }>;
  affordable: any[];
  complaints: Array<{
    complaint_id: number;
    bbl: string;
    borough: string;
    block: number;
    lot: number;
    problem_id: number;
    unit_type: string;
    space_type: string;
    type: string;
    major_category: string;
    minor_category: string;
    complaint_status: string;
    complaint_status_date: string | null;
    problem_status: string;
    problem_status_date: string;
    status_description: string;
    house_number: string;
    street_name: string;
    post_code: string;
    apartment: string;
  }>;
  violations: Array<{
    violation_id: number;
    bbl: string;
    bin: number | null;
    block: number;
    lot: number;
    boro: string;
    nov_description: string;
    nov_type: string;
    class_: string;
    rent_impairing: boolean;
    violation_status: string;
    current_status: string;
    current_status_id: number;
    current_status_date: string;
    inspection_date: string;
    nov_issued_date: string;
    approved_date: string;
    house_number: string;
    street_name: string;
    apartment: string | null;
    story: string | null;
  }>;
  acris_master: Record<string, any>;
  acris_legals: Record<string, any>;
  acris_parties: Record<string, any>;
  evictions: Array<{
    docket_number: string;
    court_index_number: string;
    bbl: string;
    bin: number;
    borough: string;
    eviction_zip: string;
    eviction_address: string;
    eviction_apt_num: string;
    community_board: number;
    council_district: number;
    census_tract: string;
    nta: string;
    latitude: string;
    longitude: string;
    executed_date: string;
    residential_commercial_ind: string;
    ejectment: string;
    eviction_possession: string;
    marshal_first_name: string;
    marshal_last_name: string;
  }>;
  counts: {
    contacts: number;
    affordable: number;
    complaints: number;
    violations: number;
    evictions: number;
    acris_docs: number;
    acris_legals: number;
    acris_parties: number;
  };
}

export interface BuildingSearchResult {
  bbl: string;
  address: string;
  borough: string;
  zip: string;
  units?: number;
  evictions3yr: number;
  openViolations: number;
  communityRating?: number;
  reviewCount?: number;
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  rentStabilized: boolean;
}

export interface BuildingApiResponse {
  result: boolean;
  data: BuildingData;
}

export interface SearchApiResponse {
  result: boolean;
  data: BuildingSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchParams {
  query?: string;
  borough?: string;
  rentStabilized?: boolean;
  evictionsMin?: number;
  evictionsMax?: number;
  violationsMin?: number;
  violationsMax?: number;
  zipCode?: string;
  page?: number;
  limit?: number;
}

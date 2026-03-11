export const degreeOptions = ["B.Tech", "M.Tech", "B.Sc", "M.Sc", "MBA", "MCA"];

export const emptyEducation = [{
  degree: "MCA",
  field_of_study: "CS",
  institution_name: "Techno Institute",
  passing_year: "2012",
  university: "John University",
  percentage_or_grade: "72%"
}];

export const emptyExperience = {
  companyName: "Trades",
  companyLocation: "England",
  designation: "Intern",
  start_date: "07-08-2022",
  end_date: "08-09-2023",
  total_years: "1",
};

export const genderOptions = ["Male", "Female", "Other"];
export const maritalstatusOptions = ["Single", "Married", "Divorced", "Widowed"];
export const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const emptyPersonal = {
  first_name: "First Employee",
  last_name: "Last Employee",
  contact: "1234567890",
  email: "email@gmail.com",
  dob: "", // use YYYY-MM-DD for date input
  gender: "Male",
  maritalstatus: "Single",
  nationality: "Indian",
  bloodgroup: "A+",
  current_address: "Flat 402, Shanti Apartments, MG Road, Pune, Maharashtra",
  permanent_address:
    "Flat 402, Shanti Apartments, MG Road, Pune, Maharashtra",
};

// gender,
// dob,
// bloodgroup,
// maritalstatus,
// nationality,
// address,
// aadharnumber,
// nominee,


const contactTypeOptions = ["Personal", "Emergency", "Work"];
export const emptyContact = {
  contact_type: "Personal",
  phone: "1234567890",
  email: "email@gmail.com",
  relation: "Brother",
  is_primary: false,
};


export const emptyBank = {
  account_holder_name: "John Doe",
  bank_name: "LYTC",
  account_number: "6516561",
  ifsc_code: "LTC15",
  branch_name: "RozeBagh",
  account_type: "Savings",
};

export const emptyNominee = {
  nominee_name:"James",
  nominee_relation: "Brother",
  nominee_contact: "1234567890"
};

export const employeeTypeOptions = ["Permanent", "Contract", "Intern"];
export const reportingToOptions = [
  "John Doe",
  "Jane Smith",
  "Michael Brown",
  "Emily Davis",
  "David Wilson"
];
export const reportingLocationOptions = [
  "Registered_Office",
  "Branch_Office"
];

export const emptyOrganization = {
  organization_name: "Techno",
  organization_code: "TECH",
  organization_location: "Pune",
  industry_type: "IT",
  department: "HR",
  designation: "Intern",
  employee_type: "Permanent",
  status: "Active",
  joining_date: "2022-08-20",
  leaving_date: "2023-08-20",
  reportingTo: "John Doe",
  reportingLocation: "Registered_Office"
};







const documentTypes = [
  "Passport Size Photo",
  "Aadhar Card",
  "PAN Card",
  "Bank PassBook",
  "Passport",
  "Updated CV",
  "UAN Card"
];

export const emptyDocument = {
  documentType: "Aadhar Card",   // ⚠ Fix spelling (was Adhaar)
  documentNumber: "1234567",
  file: "image.jpg",
};
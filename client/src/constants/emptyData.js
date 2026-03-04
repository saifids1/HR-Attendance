export const degreeOptions = [
  // School Level
  "High School",
  "Secondary School (10th)",
  "Higher Secondary (12th)",

  // Diploma
  "Diploma",
  "Advanced Diploma",
  "Post Graduate Diploma (PGDM)",

  // Associate
  "Associate of Arts (AA)",
  "Associate of Science (AS)",
  "Associate of Commerce (AC)",

  // Bachelor's Degrees
  "Bachelor of Arts (BA)",
  "Bachelor of Science (BSc)",
  "Bachelor of Commerce (BCom)",
  "Bachelor of Engineering (BE)",
  "Bachelor of Technology (BTech)",
  "Bachelor of Computer Applications (BCA)",
  "Bachelor of Business Administration (BBA)",
  "Bachelor of Architecture (BArch)",
  "Bachelor of Pharmacy (BPharm)",
  "Bachelor of Education (BEd)",
  "Bachelor of Law (LLB)",
  "Bachelor of Medicine, Bachelor of Surgery (MBBS)",

  // Master's Degrees
  "Master of Arts (MA)",
  "Master of Science (MSc)",
  "Master of Commerce (MCom)",
  "Master of Engineering (ME)",
  "Master of Technology (MTech)",
  "Master of Computer Applications (MCA)",
  "Master of Business Administration (MBA)",
  "Master of Architecture (MArch)",
  "Master of Pharmacy (MPharm)",
  "Master of Education (MEd)",
  "Master of Law (LLM)",

  // Doctoral
  "Doctor of Philosophy (PhD)",
  "Doctor of Medicine (MD)",
  "Doctor of Surgery (MS)",
  "Doctor of Business Administration (DBA)",

  // Other
  "Certification Course",
  "Vocational Training",
  "ITI",
  "Other"];

export const emptyEducation = {
  degree: "MCA",
  field_of_study: "Computer Science",
  institution_name: "Techno Institute",
  passing_year: "2012",
  university: "Bamu University",
  percentage_or_grade: "72%"
};

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
  firstName: "John",
  lastName: "Doe",
  contactNo: "1234567890",
  email: "email@gmail.com",
  dateOfBirth: "2021-02-18", // use YYYY-MM-DD for date input
  gender: "Male",
  maritalstatus: "Single",
  nationality: "Indian",
  bloodGroup: "A+",
  currentAddress: "Flat 402, Shanti Apartments, MG Road, Pune, Maharashtra",
  permanentAddress:
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


export const contactTypeOptions = ["Personal", "Emergency", "Work"];
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

export const emptyNominee = [{
  nomineeName: "John Doe",
  nomineeRelation: "Brother",
  nomineeContact: "1234567890"
}];

export const employeeTypeOptions = ["Permanent", "Contract", "Intern"];
export const reportingToOptions = [
  "John Doe",
  "Jane Smith",
  "Michael Brown",
  "Emily Davis",
  "David Wilson"
];
export const reportingLocationOptions = [
  "Registered Office",
  "Branch Office"
];

export const emptyOrganization = {
  organizationName: "I-Diligence",
  organizationCode: "TECH",
  organizationLocation: "Chatrapati Sambhaji Nagar (Aurangabad), Maharashtra",
  industryType: "IT",
  department: "HR",
  designation: "Intern",
  employeeType: "Permanent",
  status: "Active",
  joining_date: "2022-08-20",
  leaving_date: "2023-08-20",
  reportingTo: "John Doe",
  reportingLocation: "Registered Office"
};


export const documentTypes = [
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
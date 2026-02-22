// ============================================================
// i18n Translation System
// All UI strings for Nepali and English
// ============================================================

export type Language = 'NEPALI' | 'ENGLISH';

const translations: Record<string, Record<Language, string>> = {
  // ===== Common =====
  'common.appName': { NEPALI: 'स्मार्ट उपस्थिति', ENGLISH: 'Smart Attendance' },
  'common.loading': { NEPALI: 'लोड हुँदैछ...', ENGLISH: 'Loading...' },
  'common.save': { NEPALI: 'सेभ गर्नुहोस्', ENGLISH: 'Save' },
  'common.cancel': { NEPALI: 'रद्द गर्नुहोस्', ENGLISH: 'Cancel' },
  'common.delete': { NEPALI: 'हटाउनुहोस्', ENGLISH: 'Delete' },
  'common.edit': { NEPALI: 'सम्पादन', ENGLISH: 'Edit' },
  'common.create': { NEPALI: 'बनाउनुहोस्', ENGLISH: 'Create' },
  'common.search': { NEPALI: 'खोज्नुहोस्', ENGLISH: 'Search' },
  'common.filter': { NEPALI: 'फिल्टर', ENGLISH: 'Filter' },
  'common.all': { NEPALI: 'सबै', ENGLISH: 'All' },
  'common.yes': { NEPALI: 'हो', ENGLISH: 'Yes' },
  'common.no': { NEPALI: 'होइन', ENGLISH: 'No' },
  'common.submit': { NEPALI: 'पेश गर्नुहोस्', ENGLISH: 'Submit' },
  'common.close': { NEPALI: 'बन्द गर्नुहोस्', ENGLISH: 'Close' },
  'common.back': { NEPALI: 'पछाडि', ENGLISH: 'Back' },
  'common.next': { NEPALI: 'अर्को', ENGLISH: 'Next' },
  'common.actions': { NEPALI: 'कार्यहरू', ENGLISH: 'Actions' },
  'common.status': { NEPALI: 'स्थिति', ENGLISH: 'Status' },
  'common.active': { NEPALI: 'सक्रिय', ENGLISH: 'Active' },
  'common.inactive': { NEPALI: 'निष्क्रिय', ENGLISH: 'Inactive' },
  'common.success': { NEPALI: 'सफल', ENGLISH: 'Success' },
  'common.error': { NEPALI: 'त्रुटि', ENGLISH: 'Error' },
  'common.confirm': { NEPALI: 'पुष्टि गर्नुहोस्', ENGLISH: 'Confirm' },
  'common.logout': { NEPALI: 'लग आउट', ENGLISH: 'Logout' },
  'common.settings': { NEPALI: 'सेटिङ्स', ENGLISH: 'Settings' },
  'common.help': { NEPALI: 'मद्दत', ENGLISH: 'Help' },
  'common.print': { NEPALI: 'प्रिन्ट', ENGLISH: 'Print' },
  'common.export': { NEPALI: 'निर्यात', ENGLISH: 'Export' },
  'common.refresh': { NEPALI: 'रिफ्रेश', ENGLISH: 'Refresh' },
  'common.days': { NEPALI: 'दिन', ENGLISH: 'days' },
  'common.hours': { NEPALI: 'घण्टा', ENGLISH: 'hours' },
  'common.minutes': { NEPALI: 'मिनेट', ENGLISH: 'minutes' },

  // ===== Roles =====
  'role.admin': { NEPALI: 'प्रशासक', ENGLISH: 'Admin' },
  'role.employee': { NEPALI: 'कर्मचारी', ENGLISH: 'Employee' },
  'role.superAdmin': { NEPALI: 'सुपर प्रशासक', ENGLISH: 'Super Admin' },

  // ===== Login =====
  'login.title': { NEPALI: 'स्मार्ट उपस्थिति प्रणाली', ENGLISH: 'Smart Attendance System' },
  'login.email': { NEPALI: 'इमेल', ENGLISH: 'Email' },
  'login.password': { NEPALI: 'पासवर्ड', ENGLISH: 'Password' },
  'login.submit': { NEPALI: 'लग इन गर्नुहोस्', ENGLISH: 'Login' },
  'login.loggingIn': { NEPALI: 'लग इन हुँदैछ...', ENGLISH: 'Logging in...' },
  'login.failed': { NEPALI: 'लग इन असफल', ENGLISH: 'Login failed' },
  'login.demo': { NEPALI: 'डेमो: orgadmin@democompany.com / OrgAdmin@123', ENGLISH: 'Demo: orgadmin@democompany.com / OrgAdmin@123' },

  // ===== Navigation =====
  'nav.dashboard': { NEPALI: 'ड्यासबोर्ड', ENGLISH: 'Dashboard' },
  'nav.attendance': { NEPALI: 'उपस्थिति', ENGLISH: 'Attendance' },
  'nav.employees': { NEPALI: 'कर्मचारीहरू', ENGLISH: 'Employees' },
  'nav.users': { NEPALI: 'प्रयोगकर्ताहरू', ENGLISH: 'Users' },
  'nav.leaves': { NEPALI: 'बिदा व्यवस्थापन', ENGLISH: 'Leave Management' },
  'nav.payroll': { NEPALI: 'तलब व्यवस्थापन', ENGLISH: 'Payroll' },
  'nav.reports': { NEPALI: 'प्रतिवेदन', ENGLISH: 'Reports' },
  'nav.holidays': { NEPALI: 'बिदाहरू', ENGLISH: 'Holidays' },
  'nav.qrCode': { NEPALI: 'QR कोड', ENGLISH: 'QR Code' },
  'nav.settings': { NEPALI: 'सेटिङ्स', ENGLISH: 'Settings' },

  // ===== Dashboard =====
  'dashboard.title': { NEPALI: 'ड्यासबोर्ड', ENGLISH: 'Dashboard' },
  'dashboard.totalEmployees': { NEPALI: 'जम्मा कर्मचारी', ENGLISH: 'Total Employees' },
  'dashboard.todayPresent': { NEPALI: 'आज उपस्थित', ENGLISH: 'Present Today' },
  'dashboard.todayAbsent': { NEPALI: 'आज अनुपस्थित', ENGLISH: 'Absent Today' },
  'dashboard.avgAttendance': { NEPALI: 'औसत उपस्थिति', ENGLISH: 'Avg Attendance' },
  'dashboard.totalHours': { NEPALI: 'जम्मा घण्टा', ENGLISH: 'Total Hours' },
  'dashboard.systemOnline': { NEPALI: 'प्रणाली सक्रिय', ENGLISH: 'System Online' },

  // ===== Attendance =====
  'attendance.clockIn': { NEPALI: 'चेक इन', ENGLISH: 'Clock In' },
  'attendance.clockOut': { NEPALI: 'चेक आउट', ENGLISH: 'Clock Out' },
  'attendance.clockedIn': { NEPALI: 'चेक इन भएको', ENGLISH: 'Clocked In' },
  'attendance.notClockedIn': { NEPALI: 'चेक इन भएको छैन', ENGLISH: 'Not Clocked In' },
  'attendance.scanQR': { NEPALI: 'QR कोड स्क्यान गर्नुहोस्', ENGLISH: 'Scan QR Code' },
  'attendance.scanToClockIn': { NEPALI: 'चेक इन गर्न स्क्यान गर्नुहोस्', ENGLISH: 'Scan to Clock In' },
  'attendance.scanToClockOut': { NEPALI: 'चेक आउट गर्न स्क्यान गर्नुहोस्', ENGLISH: 'Scan to Clock Out' },
  'attendance.since': { NEPALI: 'देखि', ENGLISH: 'Since' },
  'attendance.recentHistory': { NEPALI: 'हालको इतिहास', ENGLISH: 'Recent History' },
  'attendance.noRecords': { NEPALI: 'कुनै रेकर्ड छैन', ENGLISH: 'No records yet' },
  'attendance.processing': { NEPALI: 'प्रशोधन हुँदैछ...', ENGLISH: 'Processing...' },
  'attendance.manual': { NEPALI: 'म्यानुअल प्रविष्टि', ENGLISH: 'Manual Entry' },
  'attendance.openCamera': { NEPALI: 'क्यामेरा खोल्नुहोस्', ENGLISH: 'Open Camera to Scan' },
  'attendance.myAttendance': { NEPALI: 'मेरो उपस्थिति', ENGLISH: 'My Attendance' },

  // ===== Employee Dashboard =====
  'employee.title': { NEPALI: 'मेरो उपस्थिति', ENGLISH: 'My Attendance' },

  // ===== Users =====
  'users.title': { NEPALI: 'प्रयोगकर्ता व्यवस्थापन', ENGLISH: 'User Management' },
  'users.addUser': { NEPALI: 'नयाँ प्रयोगकर्ता', ENGLISH: 'Add User' },
  'users.editUser': { NEPALI: 'प्रयोगकर्ता सम्पादन', ENGLISH: 'Edit User' },
  'users.firstName': { NEPALI: 'पहिलो नाम', ENGLISH: 'First Name' },
  'users.lastName': { NEPALI: 'थर', ENGLISH: 'Last Name' },
  'users.email': { NEPALI: 'इमेल', ENGLISH: 'Email' },
  'users.phone': { NEPALI: 'फोन', ENGLISH: 'Phone' },
  'users.role': { NEPALI: 'भूमिका', ENGLISH: 'Role' },
  'users.employeeId': { NEPALI: 'कर्मचारी आईडी', ENGLISH: 'Employee ID' },
  'users.password': { NEPALI: 'पासवर्ड', ENGLISH: 'Password' },
  'users.activate': { NEPALI: 'सक्रिय गर्नुहोस्', ENGLISH: 'Activate' },
  'users.deactivate': { NEPALI: 'निष्क्रिय गर्नुहोस्', ENGLISH: 'Deactivate' },
  'users.deleteConfirm': { NEPALI: 'के तपाईं यो प्रयोगकर्ता हटाउन चाहनुहुन्छ?', ENGLISH: 'Are you sure you want to delete this user?' },

  // ===== Leave =====
  'leave.title': { NEPALI: 'बिदा व्यवस्थापन', ENGLISH: 'Leave Management' },
  'leave.requestLeave': { NEPALI: 'बिदा माग्नुहोस्', ENGLISH: 'Request Leave' },
  'leave.myLeaves': { NEPALI: 'मेरो बिदा', ENGLISH: 'My Leaves' },
  'leave.allRequests': { NEPALI: 'सबै अनुरोधहरू', ENGLISH: 'All Requests' },
  'leave.pending': { NEPALI: 'विचाराधीन', ENGLISH: 'Pending' },
  'leave.approved': { NEPALI: 'स्वीकृत', ENGLISH: 'Approved' },
  'leave.rejected': { NEPALI: 'अस्वीकृत', ENGLISH: 'Rejected' },
  'leave.approve': { NEPALI: 'स्वीकृत गर्नुहोस्', ENGLISH: 'Approve' },
  'leave.reject': { NEPALI: 'अस्वीकृत गर्नुहोस्', ENGLISH: 'Reject' },
  'leave.daysUsed': { NEPALI: 'प्रयोग भएका दिन', ENGLISH: 'Days Used' },
  'leave.approvedLeaves': { NEPALI: 'स्वीकृत बिदाहरू', ENGLISH: 'Approved leaves' },
  'leave.noRequests': { NEPALI: 'कुनै बिदा अनुरोध छैन', ENGLISH: 'No leave requests' },
  'leave.noRequestsDesc': { NEPALI: 'तपाईंले अहिलेसम्म कुनै बिदा माग्नुभएको छैन।', ENGLISH: "You haven't requested any leaves yet." },
  'leave.noRequestsAdmin': { NEPALI: 'कर्मचारीहरूबाट कुनै बिदा अनुरोध छैन।', ENGLISH: 'No leave requests from employees.' },
  'leave.type': { NEPALI: 'बिदाको प्रकार', ENGLISH: 'Leave Type' },
  'leave.startDate': { NEPALI: 'सुरु मिति', ENGLISH: 'Start Date' },
  'leave.endDate': { NEPALI: 'अन्तिम मिति', ENGLISH: 'End Date' },
  'leave.reason': { NEPALI: 'कारण', ENGLISH: 'Reason' },
  'leave.reasonPlaceholder': { NEPALI: 'बिदाको कारण लेख्नुहोस्...', ENGLISH: 'Brief reason for leave...' },
  'leave.duration': { NEPALI: 'अवधि', ENGLISH: 'Duration' },
  'leave.submitting': { NEPALI: 'पेश गर्दै...', ENGLISH: 'Submitting...' },
  'leave.submitted': { NEPALI: 'बिदा अनुरोध सफलतापूर्वक पेश गरियो', ENGLISH: 'Leave request submitted successfully' },
  'leave.cancelled': { NEPALI: 'बिदा अनुरोध रद्द गरियो', ENGLISH: 'Leave request cancelled' },
  'leave.cancelConfirm': { NEPALI: 'के तपाईं यो बिदा अनुरोध रद्द गर्न चाहनुहुन्छ?', ENGLISH: 'Cancel this leave request?' },
  'leave.fillAll': { NEPALI: 'कृपया सबै फिल्ड भर्नुहोस्', ENGLISH: 'Please fill in all fields' },
  'leave.approvedBy': { NEPALI: 'स्वीकृत गर्ने:', ENGLISH: 'Approved by' },
  'leave.rejectedBy': { NEPALI: 'अस्वीकृत गर्ने:', ENGLISH: 'Rejected by' },
  'leave.selectDate': { NEPALI: 'मिति छान्नुहोस्', ENGLISH: 'Select date' },

  // Leave types
  'leave.type.SICK': { NEPALI: 'बिरामी बिदा', ENGLISH: 'Sick Leave' },
  'leave.type.CASUAL': { NEPALI: 'आकस्मिक बिदा', ENGLISH: 'Casual Leave' },
  'leave.type.ANNUAL': { NEPALI: 'वार्षिक बिदा', ENGLISH: 'Annual Leave' },
  'leave.type.UNPAID': { NEPALI: 'बिना तलब बिदा', ENGLISH: 'Unpaid Leave' },
  'leave.type.MATERNITY': { NEPALI: 'प्रसूति बिदा', ENGLISH: 'Maternity Leave' },
  'leave.type.PATERNITY': { NEPALI: 'पितृत्व बिदा', ENGLISH: 'Paternity Leave' },

  // ===== Reports =====
  'reports.title': { NEPALI: 'प्रतिवेदन', ENGLISH: 'Reports' },
  'reports.daily': { NEPALI: 'दैनिक', ENGLISH: 'Daily' },
  'reports.weekly': { NEPALI: 'साप्ताहिक', ENGLISH: 'Weekly' },
  'reports.monthly': { NEPALI: 'मासिक', ENGLISH: 'Monthly' },
  'reports.performance': { NEPALI: 'कार्यसम्पादन', ENGLISH: 'Performance' },
  'reports.present': { NEPALI: 'उपस्थित', ENGLISH: 'Present' },
  'reports.absent': { NEPALI: 'अनुपस्थित', ENGLISH: 'Absent' },
  'reports.totalHoursWorked': { NEPALI: 'जम्मा काम गरेको घण्टा', ENGLISH: 'Total Hours Worked' },
  'reports.avgHours': { NEPALI: 'औसत घण्टा', ENGLISH: 'Avg Hours' },
  'reports.attendanceRate': { NEPALI: 'उपस्थिति दर', ENGLISH: 'Attendance Rate' },
  'reports.weeklyBreakdown': { NEPALI: 'साप्ताहिक विवरण', ENGLISH: 'Weekly Breakdown' },
  'reports.employeePerformance': { NEPALI: 'कर्मचारी कार्यसम्पादन', ENGLISH: 'Employee Performance' },
  'reports.excellent': { NEPALI: 'उत्कृष्ट', ENGLISH: 'Excellent' },
  'reports.good': { NEPALI: 'राम्रो', ENGLISH: 'Good' },
  'reports.average': { NEPALI: 'औसत', ENGLISH: 'Average' },
  'reports.needsImprovement': { NEPALI: 'सुधार आवश्यक', ENGLISH: 'Needs Improvement' },
  'reports.poor': { NEPALI: 'कमजोर', ENGLISH: 'Poor' },

  // ===== Payroll =====
  'payroll.title': { NEPALI: 'तलब व्यवस्थापन', ENGLISH: 'Payroll Management' },
  'payroll.settings': { NEPALI: 'तलब सेटिङ्स', ENGLISH: 'Pay Settings' },
  'payroll.generate': { NEPALI: 'तलब बनाउनुहोस्', ENGLISH: 'Generate Payroll' },
  'payroll.records': { NEPALI: 'तलब रेकर्ड', ENGLISH: 'Payroll Records' },
  'payroll.basicSalary': { NEPALI: 'आधारभूत तलब', ENGLISH: 'Basic Salary' },
  'payroll.allowances': { NEPALI: 'भत्ता', ENGLISH: 'Allowances' },
  'payroll.deductions': { NEPALI: 'कटौती', ENGLISH: 'Deductions' },
  'payroll.netSalary': { NEPALI: 'खुद तलब', ENGLISH: 'Net Salary' },
  'payroll.grossSalary': { NEPALI: 'कुल तलब', ENGLISH: 'Gross Salary' },
  'payroll.tds': { NEPALI: 'कर कटौती', ENGLISH: 'TDS' },
  'payroll.ssf': { NEPALI: 'सामाजिक सुरक्षा कोष', ENGLISH: 'SSF' },

  // ===== QR Code =====
  'qr.title': { NEPALI: 'QR कोड', ENGLISH: 'QR Code' },
  'qr.generate': { NEPALI: 'QR कोड बनाउनुहोस्', ENGLISH: 'Generate QR Code' },
  'qr.active': { NEPALI: 'सक्रिय QR कोड', ENGLISH: 'Active QR Code' },
  'qr.revoke': { NEPALI: 'QR कोड रद्द गर्नुहोस्', ENGLISH: 'Revoke QR Code' },
  'qr.scanCount': { NEPALI: 'स्क्यान संख्या', ENGLISH: 'Scan Count' },
  'qr.expiresAt': { NEPALI: 'समाप्ति समय', ENGLISH: 'Expires At' },

  // ===== Holidays =====
  'holidays.title': { NEPALI: 'बिदाहरू', ENGLISH: 'Holidays' },
  'holidays.addHoliday': { NEPALI: 'बिदा थप्नुहोस्', ENGLISH: 'Add Holiday' },
  'holidays.sync': { NEPALI: 'क्यालेन्डरबाट सिंक', ENGLISH: 'Sync from Calendar' },
  'holidays.name': { NEPALI: 'बिदाको नाम', ENGLISH: 'Holiday Name' },
  'holidays.date': { NEPALI: 'मिति', ENGLISH: 'Date' },

  // ===== Date/Calendar =====
  'date.year': { NEPALI: 'वर्ष', ENGLISH: 'Year' },
  'date.month': { NEPALI: 'महिना', ENGLISH: 'Month' },
  'date.day': { NEPALI: 'गते', ENGLISH: 'Day' },
  'date.today': { NEPALI: 'आज', ENGLISH: 'Today' },
  'date.selectDate': { NEPALI: 'मिति छान्नुहोस्', ENGLISH: 'Select date' },
  'date.confirm': { NEPALI: 'छान्नुहोस्', ENGLISH: 'Confirm' },

  // ===== Footer =====
  'footer.copyright': { NEPALI: '© सर्वाधिकार सुरक्षित', ENGLISH: '© All rights reserved' },
  'footer.version': { NEPALI: 'संस्करण', ENGLISH: 'Version' },
};

/**
 * Get translated string
 */
export function t(key: string, lang: Language = 'NEPALI'): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry['ENGLISH'] || key;
}

/**
 * Get all translations for a language (useful for passing to components)
 */
export function getTranslations(lang: Language): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(translations)) {
    result[key] = value[lang] || value['ENGLISH'] || key;
  }
  return result;
}

export default translations;

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
  'common.months': { NEPALI: 'महिना', ENGLISH: 'months' },
  'common.from': { NEPALI: 'देखि', ENGLISH: 'From' },
  'common.to': { NEPALI: 'सम्म', ENGLISH: 'To' },
  'common.view': { NEPALI: 'हेर्नुहोस्', ENGLISH: 'View' },
  'common.download': { NEPALI: 'डाउनलोड', ENGLISH: 'Download' },
  'common.upgrade': { NEPALI: 'अपग्रेड गर्नुहोस्', ENGLISH: 'Upgrade to Operations' },
  'common.opsRequired': { NEPALI: 'Operations प्लान आवश्यक छ', ENGLISH: 'Requires Operations plan' },
  'common.preview': { NEPALI: 'पूर्वावलोकन', ENGLISH: 'Preview' },
  'common.noData': { NEPALI: 'डाटा छैन', ENGLISH: 'No data' },
  'common.noRecord': { NEPALI: 'कुनै रेकर्ड छैन', ENGLISH: 'No record' },
  'common.total': { NEPALI: 'जम्मा', ENGLISH: 'Total' },
  'common.month': { NEPALI: 'महिना', ENGLISH: 'Month' },

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
  'attendance.workingDays': { NEPALI: 'कार्य दिन', ENGLISH: 'Working' },
  'attendance.present': { NEPALI: 'उपस्थित', ENGLISH: 'Present' },
  'attendance.absent': { NEPALI: 'अनुपस्थित', ENGLISH: 'Absent' },
  'attendance.paidLeave': { NEPALI: 'सशुल्क बिदा', ENGLISH: 'Paid leave' },
  'attendance.unpaidLeave': { NEPALI: 'बिना तलब बिदा', ENGLISH: 'Unpaid leave' },

  // ===== Employee Dashboard =====
  'employee.title': { NEPALI: 'मेरो उपस्थिति', ENGLISH: 'My Attendance' },
  'employee.profile': { NEPALI: 'प्रोफाइल', ENGLISH: 'Profile' },
  'employee.shiftTime': { NEPALI: 'शिफ्ट समय', ENGLISH: 'Shift Time' },
  'employee.orgDefault': { NEPALI: 'संगठन पूर्वनिर्धारित', ENGLISH: 'Org default' },
  'employee.joinedDate': { NEPALI: 'सिर्जना मिति', ENGLISH: 'Joined' },
  'employee.id': { NEPALI: 'कर्मचारी आईडी', ENGLISH: 'Employee ID' },
  'employee.email': { NEPALI: 'इमेल', ENGLISH: 'Email' },
  'employee.phone': { NEPALI: 'फोन', ENGLISH: 'Phone' },
  'employee.role': { NEPALI: 'भूमिका', ENGLISH: 'Role' },

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
  'payroll.process': { NEPALI: 'प्रशोधन', ENGLISH: 'Process' },
  'payroll.paid': { NEPALI: 'भुक्तानी', ENGLISH: 'Paid' },
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
  'payroll.payslip': { NEPALI: 'पे-स्लिप', ENGLISH: 'Payslip' },
  'payroll.preview': { NEPALI: 'पूर्वावलोकन', ENGLISH: 'Preview' },
  'payroll.download': { NEPALI: 'डाउनलोड', ENGLISH: 'Download' },
  'payroll.mySalary': { NEPALI: 'मेरो तलब इतिहास', ENGLISH: 'My Salary & Payslips' },
  'payroll.monthlyBreakdown': { NEPALI: 'मासिक विवरण', ENGLISH: 'Monthly Breakdown' },
  'payroll.summaryPdf': { NEPALI: 'सारांश PDF', ENGLISH: 'Download Summary PDF' },
  'payroll.generating': { NEPALI: 'तयार हुँदैछ...', ENGLISH: 'Generating...' },
  'payroll.totalNet': { NEPALI: 'जम्मा तलब', ENGLISH: 'Total Net' },
  'payroll.avgMonth': { NEPALI: 'औसत', ENGLISH: 'Avg/Month' },
  'payroll.perMonth': { NEPALI: 'प्रति महिना', ENGLISH: 'per month' },
  'payroll.recorded': { NEPALI: 'रेकर्ड', ENGLISH: 'Recorded' },
  'payroll.total': { NEPALI: 'जम्मा', ENGLISH: 'TOTAL' },
  'payroll.monthly': { NEPALI: 'मासिक', ENGLISH: 'Monthly' },
  'payroll.range': { NEPALI: 'दायरा', ENGLISH: 'Range' },
  'payroll.selectDate': { NEPALI: 'मिति छान्नुहोस्', ENGLISH: 'Select a date range' },
  'payroll.selectDateHint': { NEPALI: 'माथि देखि/सम्म मिति छानेर "हेर्नुहोस्" थिच्नुहोस्', ENGLISH: 'Choose from/to dates above and click View' },
  'payroll.noRecord': { NEPALI: 'कुनै रेकर्ड छैन', ENGLISH: 'No record' },
  'payroll.upgradeBtn': { NEPALI: 'अपग्रेड गर्नुहोस्', ENGLISH: 'Upgrade to Operations' },
  'payroll.opsRequired': { NEPALI: 'Operations प्लान आवश्यक छ', ENGLISH: 'Requires Operations plan' },
  'payroll.pdfAvailable': { NEPALI: 'PDF डाउनलोड Operations plan मा उपलब्ध छ', ENGLISH: 'PDF downloads are available on the Operations plan' },
  'payroll.multiMonth': { NEPALI: 'बहु-महिना तलब दृश्य', ENGLISH: 'Multi-Month Salary View' },
  'payroll.multiMonthDesc': { NEPALI: 'कर्मचारीहरूको धेरै महिनाको तलब एकै पटक हेर्नुहोस्', ENGLISH: 'View salary across multiple months' },
  'payroll.multiMonthUpgradeDesc': { NEPALI: 'एकै पटक धेरै महिनाको तलब तुलना गर्नुहोस् र CSV निर्यात गर्नुहोस्।', ENGLISH: 'Compare salaries across months side-by-side and export to CSV for payroll audits.' },
  'payroll.annualTax': { NEPALI: 'वार्षिक कर विवरण', ENGLISH: 'Annual Tax Details' },
  'payroll.annualReport': { NEPALI: 'वार्षिक कर रिपोर्ट', ENGLISH: 'Annual Tax Report' },
  'payroll.annualReportDesc': { NEPALI: 'सबै कर्मचारीको वार्षिक TDS, SSF र खुद तलब एकै ठाउँमा हेर्नुहोस्।', ENGLISH: 'View all employee annual TDS, SSF and net salary in one place.' },
  'payroll.viewReport': { NEPALI: 'रिपोर्ट हेर्नुहोस्', ENGLISH: 'View Report' },
  'payroll.csvDownload': { NEPALI: 'CSV डाउनलोड', ENGLISH: 'CSV Download' },
  'payroll.annualBasic': { NEPALI: 'वार्षिक आधारभूत', ENGLISH: 'Annual Basic' },
  'payroll.annualGross': { NEPALI: 'वार्षिक कुल', ENGLISH: 'Annual Gross' },
  'payroll.annualNet': { NEPALI: 'वार्षिक खुद', ENGLISH: 'Annual Net' },
  'payroll.noYearData': { NEPALI: 'यो वर्षको तलब गणना गरिएको छैन', ENGLISH: 'No salary data for this year' },
  'payroll.employee': { NEPALI: 'कर्मचारी', ENGLISH: 'Employee' },
  'payroll.basic': { NEPALI: 'आधारभूत', ENGLISH: 'Basic' },
  'payroll.gross': { NEPALI: 'कुल', ENGLISH: 'Gross' },
  'payroll.net': { NEPALI: 'खुद', ENGLISH: 'Net' },
  'payroll.details': { NEPALI: 'विस्तृत', ENGLISH: 'Details' },
  'payroll.earnings': { NEPALI: 'आमदानी', ENGLISH: 'Earnings' },
  'payroll.da': { NEPALI: 'महँगी भत्ता', ENGLISH: 'DA' },
  'payroll.transport': { NEPALI: 'यातायात भत्ता', ENGLISH: 'Transport' },
  'payroll.medical': { NEPALI: 'चिकित्सा भत्ता', ENGLISH: 'Medical' },
  'payroll.other': { NEPALI: 'अन्य भत्ता', ENGLISH: 'Other' },
  'payroll.overtime': { NEPALI: 'ओभरटाइम', ENGLISH: 'Overtime' },
  'payroll.dashainBonus': { NEPALI: 'दशैं बोनस', ENGLISH: 'Dashain Bonus' },
  'payroll.totalEarnings': { NEPALI: 'कुल आमदानी', ENGLISH: 'Gross salary' },
  'payroll.absenceDeduction': { NEPALI: 'अनुपस्थिति कटौती', ENGLISH: 'Absence deduction' },
  'payroll.advance': { NEPALI: 'पेशगी कटौती', ENGLISH: 'Advance' },
  'payroll.totalDeductions': { NEPALI: 'जम्मा कटौती', ENGLISH: 'Total deductions' },
  'payroll.employer': { NEPALI: 'नियोक्ता', ENGLISH: 'Employer' },
  'payroll.employerContrib': { NEPALI: 'नियोक्ता योगदान', ENGLISH: 'Employer contribution' },
  'payroll.marriedSlab': { NEPALI: '* विवाहित कर स्ल्याब लागू', ENGLISH: '* Married tax slab applied' },
  'payroll.viewOnly': { NEPALI: 'हेर्ने मात्र', ENGLISH: 'View only' },

  // ===== Documents =====
  'documents.title': { NEPALI: 'कागजातहरू', ENGLISH: 'Documents' },
  'documents.upload': { NEPALI: 'अपलोड गर्नुहोस्', ENGLISH: 'Upload' },
  'documents.uploadNew': { NEPALI: 'नयाँ कागजात अपलोड गर्नुहोस्', ENGLISH: 'Upload new document' },
  'documents.uploading': { NEPALI: 'अपलोड हुँदैछ...', ENGLISH: 'Uploading...' },
  'documents.uploaded': { NEPALI: 'कागजात सफलतापूर्वक अपलोड भयो', ENGLISH: 'Document uploaded successfully' },
  'documents.deleted': { NEPALI: 'कागजात मेटाइयो', ENGLISH: 'Document deleted' },
  'documents.noDocuments': { NEPALI: 'कुनै कागजात छैन', ENGLISH: 'No documents yet' },
  'documents.uploadHint': { NEPALI: 'कागजात अपलोड गर्न माथिको बटन थिच्नुहोस्', ENGLISH: 'Upload documents using the button above' },
  'documents.type': { NEPALI: 'कागजात प्रकार', ENGLISH: 'Document Type' },
  'documents.optional': { NEPALI: 'ऐच्छिक', ENGLISH: 'optional' },
  'documents.notePlaceholder': { NEPALI: 'नोट थप्नुहोस्...', ENGLISH: 'Add a note...' },
  'documents.noTypes': { NEPALI: 'अहिलेसम्म कुनै कागजात प्रकार सेट गरिएको छैन। कृपया प्रशासकलाई सम्पर्क गर्नुहोस्।', ENGLISH: 'No document types have been configured yet. Please ask your admin to set them up in Settings.' },
  'documents.viewOnly': { NEPALI: 'हेर्ने मात्र', ENGLISH: 'View only' },
  'documents.previewUnavailable': { NEPALI: 'पूर्वावलोकन उपलब्ध छैन', ENGLISH: 'Preview not available' },
  'documents.confirmDelete': { NEPALI: 'पक्का?', ENGLISH: 'Confirm' },
  'documents.dragOrClick': { NEPALI: 'फाइल छान्नुहोस् वा यहाँ ड्र्याग गर्नुहोस्', ENGLISH: 'Click to select or drag and drop' },
  'documents.view': { NEPALI: 'हेर्नुहोस्', ENGLISH: 'View' },
  'documents.delete': { NEPALI: 'मेटाउनुहोस्', ENGLISH: 'Delete' },
  'documents.description': { NEPALI: 'विवरण', ENGLISH: 'Description' },

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
  if (!entry) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    return key;
  }
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
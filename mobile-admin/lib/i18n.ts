import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── String definitions ───────────────────────────────────────────────────────
const strings = {
  en: {
    // Common
    loading: 'Loading…',
    error: 'Something went wrong',
    retry: 'Retry',
    cancel: 'Cancel',
    submit: 'Submit',
    save: 'Save',
    close: 'Close',
    confirm: 'Confirm',

    // Auth
    signIn: 'Sign In',
    signOut: 'Sign Out',
    email: 'Work Email',
    password: 'Password',
    loginError: 'Login failed. Check your credentials.',

    // Nav tabs
    home: 'Home',
    attendance: 'Attendance',
    leaves: 'Leaves',
    salary: 'Salary',

    // Home
    greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
    clockedIn: 'Clocked In',
    notClockedIn: 'Not Clocked In',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    since: 'Since',
    elapsed: 'elapsed',
    daysPresent: 'days present',
    leaveBalance: 'days remaining',
    thisMonth: 'This Month',

    // Attendance
    attendanceHistory: 'Attendance History',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    onTime: 'On Time',
    autoClosed: 'Auto-closed',
    active: 'Active',
    totalHours: 'Total Hours',
    noRecords: 'No attendance records for this month.',

    // QR
    qrScanner: 'QR Check-in',
    scanQR: 'Point your camera at the attendance QR code',
    scanSuccess: 'Clocked in successfully!',
    scanError: 'Scan failed',

    // GPS
    gpsCheckin: 'GPS Check-in',
    checkIn: 'Check In',
    checkOut: 'Check Out',
    fetchingLocation: 'Getting your location…',
    outsideGeofence: 'You are outside the allowed area.',
    locationError: 'Could not get your location. Please enable GPS.',

    // Leaves
    myLeaves: 'My Leaves',
    leaveRequest: 'New Leave Request',
    leaveType: 'Leave Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    reason: 'Reason',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    all: 'All',
    annual: 'Annual',
    sick: 'Sick',
    casual: 'Casual',
    maternity: 'Maternity',
    paternity: 'Paternity',
    unpaid: 'Unpaid',
    available: 'available',
    days: 'days',
    noLeaves: 'No leave requests found.',

    // Salary
    salaryHistory: 'Salary History',
    netSalary: 'Net Salary',
    earnings: 'Earnings',
    deductions: 'Deductions',
    basicSalary: 'Basic Salary',
    viewPdf: 'View Payslip PDF',
    noSalary: 'No salary records found.',
    draft: 'Draft',
    processed: 'Processed',
    approvedSalary: 'Approved',
    paid: 'Paid',
  },

  np: {
    loading: 'लोड हुँदैछ…',
    error: 'केही गल्ती भयो',
    retry: 'पुनः प्रयास',
    cancel: 'रद्द गर्नुहोस्',
    submit: 'पेश गर्नुहोस्',
    save: 'सुरक्षित',
    close: 'बन्द गर्नुहोस्',
    confirm: 'पुष्टि गर्नुहोस्',

    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    email: 'कार्य इमेल',
    password: 'पासवर्ड',
    loginError: 'लगइन असफल। प्रमाणपत्र जाँच गर्नुहोस्।',

    home: 'गृहपृष्ठ',
    attendance: 'उपस्थिति',
    leaves: 'बिदा',
    salary: 'तलब',

    greeting: { morning: 'शुभ प्रभात', afternoon: 'शुभ दिन', evening: 'शुभ साँझ' },
    clockedIn: 'उपस्थित',
    notClockedIn: 'अनुपस्थित',
    clockIn: 'उपस्थिति जनाउनुहोस्',
    clockOut: 'बाहिर जानुहोस्',
    since: 'देखि',
    elapsed: 'बितेको',
    daysPresent: 'दिन उपस्थित',
    leaveBalance: 'दिन बाँकी',
    thisMonth: 'यो महिना',

    attendanceHistory: 'उपस्थिति इतिहास',
    present: 'उपस्थित',
    absent: 'अनुपस्थित',
    late: 'ढिला',
    onTime: 'समयमा',
    autoClosed: 'स्वतः बन्द',
    active: 'सक्रिय',
    totalHours: 'कुल घण्टा',
    noRecords: 'यस महिनाको कोई रेकर्ड छैन।',

    qrScanner: 'QR चेक-इन',
    scanQR: 'उपस्थिति QR कोडमा क्यामेरा राख्नुहोस्',
    scanSuccess: 'सफलतापूर्वक उपस्थिति जनाइयो!',
    scanError: 'स्क्यान असफल',

    gpsCheckin: 'GPS चेक-इन',
    checkIn: 'चेक इन',
    checkOut: 'चेक आउट',
    fetchingLocation: 'स्थान पत्ता लगाउँदैछ…',
    outsideGeofence: 'तपाई अनुमत क्षेत्र बाहिर हुनुहुन्छ।',
    locationError: 'स्थान थाहा पाउन सकिएन। GPS सक्षम गर्नुहोस्।',

    myLeaves: 'मेरो बिदा',
    leaveRequest: 'नयाँ बिदा निवेदन',
    leaveType: 'बिदाको प्रकार',
    startDate: 'सुरु मिति',
    endDate: 'अन्त्य मिति',
    reason: 'कारण',
    pending: 'विचाराधीन',
    approved: 'स्वीकृत',
    rejected: 'अस्वीकृत',
    all: 'सबै',
    annual: 'वार्षिक',
    sick: 'बिरामी',
    casual: 'आकस्मिक',
    maternity: 'प्रसूति',
    paternity: 'पितृत्व',
    unpaid: 'अवैतनिक',
    available: 'उपलब्ध',
    days: 'दिन',
    noLeaves: 'कोई बिदा निवेदन फेला परेन।',

    salaryHistory: 'तलब इतिहास',
    netSalary: 'खुद तलब',
    earnings: 'आम्दानी',
    deductions: 'कट्टी',
    basicSalary: 'आधारभूत तलब',
    viewPdf: 'तलबपर्ची हेर्नुहोस्',
    noSalary: 'कोई तलब रेकर्ड फेला परेन।',
    draft: 'मस्यौदा',
    processed: 'प्रशोधित',
    approvedSalary: 'स्वीकृत',
    paid: 'भुक्तान',
  },
} as const;

type Lang = keyof typeof strings;
type Strings = typeof strings.en;

// ─── Zustand i18n store ───────────────────────────────────────────────────────
const LANG_KEY = 'smart_attendance_language';

interface I18nState {
  lang: Lang;
  t: Strings;
  setLang: (lang: Lang) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useI18n = create<I18nState>((set) => ({
  lang: 'en',
  t: strings.en,

  setLang: async (lang: Lang) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
    set({ lang, t: strings[lang] });
  },

  initialize: async () => {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    const lang: Lang = stored === 'np' ? 'np' : 'en';
    set({ lang, t: strings[lang] });
  },
}));

// Convenience: use just the translations object
export const useT = () => useI18n((s) => s.t);

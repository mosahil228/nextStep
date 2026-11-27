// ============================================================
//  Auto-import settings — edit this file to change WHAT is fetched.
//  After editing, redeploy:  npx supabase functions deploy daily-import --no-verify-jwt
// ============================================================

// Adzuna searches (India). Each search = 1 API call per day.
// About 8 calls a day ≈ 240 a month, well inside Adzuna's free limit.
export const ADZUNA_SEARCHES: { what: string; group: 'IT' | 'Non-IT' }[] = [
  { what: 'fresher software engineer', group: 'IT' },
  { what: 'software developer', group: 'IT' },
  { what: 'data analyst', group: 'IT' },
  { what: 'java developer', group: 'IT' },
  { what: 'react developer', group: 'IT' },
  { what: 'python developer', group: 'IT' },
  { what: 'fresher graduate trainee', group: 'Non-IT' },
  { what: 'customer support executive', group: 'Non-IT' },
];

// Company career pages on Greenhouse: the part after boards.greenhouse.io/
// e.g. careers link https://boards.greenhouse.io/examplecompany → token 'examplecompany'
// domain is used for the logo.
export const GREENHOUSE: { token: string; company: string; domain?: string }[] = [
  // { token: 'examplecompany', company: 'Example Company', domain: 'example.com' },
];

// Company career pages on Lever: the part after jobs.lever.co/
// e.g. https://jobs.lever.co/examplecompany → site 'examplecompany'
export const LEVER: { site: string; company: string; domain?: string }[] = [
  // { site: 'examplecompany', company: 'Example Company', domain: 'example.com' },
];

// Only keep career-page jobs located in India (or remote India).
export const INDIA_RE = /india|bengaluru|bangalore|hyderabad|pune|mumbai|navi mumbai|thane|delhi|new delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|kochi|coimbatore|jaipur|indore|chandigarh|trivandrum|thiruvananthapuram|mysore|mysuru|bhubaneswar|nagpur|vadodara|lucknow|visakhapatnam/i;

// Company websites for logos. Key = company name in lowercase without
// "ltd / pvt / limited / technologies…". Add more any time.
export const KNOWN_DOMAINS: Record<string, string> = {
  'tcs': 'tcs.com', 'tata consultancy': 'tcs.com', 'infosys': 'infosys.com', 'wipro': 'wipro.com',
  'hcl': 'hcltech.com', 'hcltech': 'hcltech.com', 'tech mahindra': 'techmahindra.com', 'accenture': 'accenture.com',
  'cognizant': 'cognizant.com', 'capgemini': 'capgemini.com', 'ibm': 'ibm.com', 'deloitte': 'deloitte.com',
  'ey': 'ey.com', 'ernst young': 'ey.com', 'kpmg': 'kpmg.com', 'pwc': 'pwc.com', 'pricewaterhousecoopers': 'pwc.com',
  'ltimindtree': 'ltimindtree.com', 'lti mindtree': 'ltimindtree.com', 'mphasis': 'mphasis.com', 'persistent': 'persistent.com',
  'hexaware': 'hexaware.com', 'coforge': 'coforge.com', 'zensar': 'zensar.com', 'birlasoft': 'birlasoft.com',
  'cyient': 'cyient.com', 'sasken': 'sasken.com', 'mastek': 'mastek.com', 'sonata': 'sonata-software.com',
  'genpact': 'genpact.com', 'concentrix': 'concentrix.com', 'teleperformance': 'teleperformance.com', 'wns': 'wns.com',
  'amazon': 'amazon.com', 'microsoft': 'microsoft.com', 'google': 'google.com', 'meta': 'meta.com', 'apple': 'apple.com',
  'oracle': 'oracle.com', 'sap': 'sap.com', 'adobe': 'adobe.com', 'salesforce': 'salesforce.com', 'cisco': 'cisco.com',
  'intel': 'intel.com', 'qualcomm': 'qualcomm.com', 'nvidia': 'nvidia.com', 'dell': 'dell.com', 'hp': 'hp.com',
  'walmart': 'walmart.com', 'walmart global tech': 'walmart.com', 'goldman sachs': 'goldmansachs.com',
  'jpmorgan': 'jpmorganchase.com', 'jp morgan': 'jpmorganchase.com', 'jpmorgan chase': 'jpmorganchase.com',
  'morgan stanley': 'morganstanley.com', 'barclays': 'barclays.com', 'citi': 'citi.com', 'hsbc': 'hsbc.com',
  'deutsche bank': 'db.com', 'wells fargo': 'wellsfargo.com', 'american express': 'americanexpress.com',
  'hdfc bank': 'hdfcbank.com', 'icici bank': 'icicibank.com', 'axis bank': 'axisbank.com', 'kotak mahindra bank': 'kotak.com',
  'flipkart': 'flipkart.com', 'myntra': 'myntra.com', 'swiggy': 'swiggy.com', 'zomato': 'zomato.com', 'paytm': 'paytm.com',
  'phonepe': 'phonepe.com', 'razorpay': 'razorpay.com', 'zoho': 'zoho.com', 'freshworks': 'freshworks.com',
  'meesho': 'meesho.com', 'cred': 'cred.club', 'ola': 'olacabs.com', 'uber': 'uber.com', 'byjus': 'byjus.com',
  'nykaa': 'nykaa.com', 'zepto': 'zeptonow.com', 'groww': 'groww.in', 'zerodha': 'zerodha.com', 'policybazaar': 'policybazaar.com',
  'airtel': 'airtel.in', 'bharti airtel': 'airtel.in', 'jio': 'jio.com', 'reliance': 'ril.com', 'reliance industries': 'ril.com',
  'larsen toubro': 'larsentoubro.com', 'l t': 'larsentoubro.com', 'tata motors': 'tatamotors.com', 'mahindra': 'mahindra.com',
  'bajaj finserv': 'bajajfinserv.in', 'bosch': 'bosch.com', 'siemens': 'siemens.com', 'honeywell': 'honeywell.com',
  'ge': 'ge.com', 'philips': 'philips.com', 'samsung': 'samsung.com', 'thoughtworks': 'thoughtworks.com',
  'epam': 'epam.com', 'globallogic': 'globallogic.com', 'virtusa': 'virtusa.com', 'ust': 'ust.com', 'nagarro': 'nagarro.com',
};

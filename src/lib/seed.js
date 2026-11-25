// Sample jobs used only in DEMO mode (before you connect Supabase).
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const base = [
  {
    company: 'Google', role: 'Software Engineer – Frontend', location: 'Bengaluru', work_mode: 'Hybrid',
    job_type: 'Full-time', exp_min: 2, exp_max: 5, salary: '₹25–40 LPA',
    skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Testing'],
    apply_clicks: 182,
    description: `About the role
We are looking for a Frontend Software Engineer to build fast, accessible web experiences used by millions.

Responsibilities
- Build reusable UI components with React and TypeScript
- Collaborate with designers and backend engineers on new features
- Write unit and integration tests, review code
- Improve web performance and accessibility

Requirements
- 2+ years of experience in frontend development
- Strong JavaScript, HTML, CSS fundamentals
- Experience with React, Redux or similar state management
- Familiarity with REST APIs, Git and CI/CD
- B.Tech / B.E. in Computer Science or equivalent`,
  },
  {
    company: 'TCS', role: 'Graduate Trainee – Freshers 2026', location: 'Pan India', work_mode: 'On-site',
    job_type: 'Full-time', exp_min: 0, exp_max: 0, salary: '₹3.6–7 LPA',
    skills: ['Java', 'Python', 'SQL', 'Communication', 'Problem Solving'],
    apply_clicks: 240,
    description: `TCS NQT hiring for 2025 & 2026 batch graduates.

Eligibility
- B.E / B.Tech / MCA / M.Sc / BCA / B.Sc graduates
- Minimum 60% throughout academics
- No active backlogs

Skills
- Basic programming in Java, Python or C++
- Knowledge of SQL and DBMS concepts
- Good communication and problem solving skills
- Willingness to relocate anywhere in India`,
  },
  {
    company: 'Amazon', role: 'Data Analyst', location: 'Hyderabad', work_mode: 'On-site',
    job_type: 'Full-time', exp_min: 1, exp_max: 3, salary: '₹12–18 LPA',
    skills: ['SQL', 'Python', 'Excel', 'Tableau', 'Statistics', 'Power BI'],
    apply_clicks: 131,
    description: `Amazon is hiring a Data Analyst to drive insights for the retail business.

What you will do
- Write complex SQL queries to extract and analyse data
- Build dashboards in Tableau / Power BI / QuickSight
- Partner with stakeholders to define metrics and KPIs
- Automate reports using Python

Basic qualifications
- 1+ years in data analysis or business intelligence
- Advanced SQL and Excel skills
- Knowledge of statistics and A/B testing
- Experience with Python (pandas)`,
  },
  {
    company: 'Infosys', role: 'Java Developer', location: 'Pune', work_mode: 'Hybrid',
    job_type: 'Full-time', exp_min: 3, exp_max: 6, salary: '₹10–16 LPA',
    skills: ['Java', 'Spring Boot', 'Microservices', 'SQL', 'AWS', 'Docker'],
    apply_clicks: 64,
    description: `Job Description
- Design and develop microservices using Java 17 and Spring Boot
- Build REST APIs and integrate with SQL / NoSQL databases
- Deploy services on AWS using Docker and Kubernetes
- Participate in Agile ceremonies

Required skills
- 3–6 years of Java development experience
- Spring Boot, Hibernate, JPA
- Microservices architecture, Kafka is a plus
- CI/CD with Jenkins, Git`,
  },
  {
    company: 'Swiggy', role: 'Product Design Intern', location: 'Remote', work_mode: 'Remote',
    job_type: 'Internship', exp_min: 0, exp_max: 1, salary: '₹40k / month',
    skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping'],
    apply_clicks: 77,
    description: `6-month Product Design internship.

You will
- Design flows and high-fidelity screens in Figma
- Run quick user research and usability tests
- Work with PMs and engineers to ship features

You have
- A portfolio showing UI/UX case studies
- Strong Figma and prototyping skills
- Understanding of design systems`,
  },
  {
    company: 'Microsoft', role: 'Cloud Support Engineer', location: 'Noida', work_mode: 'On-site',
    job_type: 'Full-time', exp_min: 0, exp_max: 2, salary: '₹9–14 LPA',
    skills: ['Azure', 'Networking', 'Linux', 'Troubleshooting', 'PowerShell'],
    apply_clicks: 98,
    description: `Help customers succeed on Microsoft Azure.

Responsibilities
- Troubleshoot Azure compute, storage and networking issues
- Communicate clearly with customers via calls and email
- Document solutions and contribute to the knowledge base

Qualifications
- Fresher or up to 2 years of experience
- Basics of networking (DNS, TCP/IP), Linux and Windows Server
- Scripting in PowerShell or Bash is a plus
- Excellent communication skills`,
  },
  {
    company: 'Zomato', role: 'Backend Engineer (Node.js)', location: 'Gurugram', work_mode: 'Hybrid',
    job_type: 'Full-time', exp_min: 2, exp_max: 4, salary: '₹18–30 LPA',
    skills: ['Node.js', 'MongoDB', 'Redis', 'AWS', 'System Design'],
    apply_clicks: 120,
    description: `Build high-scale backend systems for millions of orders.

- Design APIs in Node.js / Express
- Work with MongoDB, MySQL, Redis and Kafka
- Own services end-to-end: design, build, deploy, monitor
- 2+ years backend experience, solid DSA and system design`,
  },
  {
    company: 'Deloitte', role: 'Business Analyst', location: 'Mumbai', work_mode: 'On-site',
    job_type: 'Full-time', exp_min: 4, exp_max: 8, salary: '₹15–22 LPA',
    skills: ['Requirements', 'JIRA', 'SQL', 'Stakeholder Management', 'Agile'],
    apply_clicks: 41,
    description: `Business Analyst for digital transformation projects.

- Gather and document business requirements (BRD, FRD, user stories)
- Work in Agile teams with JIRA and Confluence
- Conduct gap analysis and process mapping
- Strong SQL and stakeholder management
- 4–8 years of experience, MBA preferred`,
  },
];

export function seedJobs() {
  return base.map((j, i) => ({
    ...j,
    id: 'demo-' + (i + 1),
    posted_at: daysAgo(i),
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
    is_active: true,
    views: j.apply_clicks * 3,
    apply_link: 'https://www.google.com/search?q=' + encodeURIComponent(j.company + ' careers ' + j.role),
    logo_url: '',
  }));
}

import type { RiskAssessment, ApprovalStep } from './types';

const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

const initialApprovalSteps: ApprovalStep[] = [
  { level: 'Vessel Certificates' },
  { level: 'Senior Director' },
  { level: 'Director General' },
];

export const mockRiskAssessments: RiskAssessment[] = [
  {
    id: 'ra-001',
    referenceNumber: 'CCG-RA-2024-001',
    vesselName: 'CCGS Amundsen',
    vesselIMO: '9275052',
    voyageDetails: 'Arctic Survey Mission, Resolute Bay to Kugluktuk, Departs 2024-07-15',
    reasonForRequest: 'Sailing with one less certified navigation officer.',
    personnelShortages: 'Missing 1x Navigational Watch Rating (NWR). Current NWR has exceeded work hours.',
    proposedOperationalDeviations: 'Master to take additional watch duty. Increased rest periods for remaining NWR.',
    submittedBy: 'Capt. Eva Rostova',
    submissionDate: twoDaysAgo.toISOString(),
    submissionTimestamp: twoDaysAgo.getTime(),
    status: 'Pending Vessel Certificates',
    attachments: [
      { id: 'att-001', name: 'Crew_Manifest_Amundsen.pdf', url: '#', type: 'application/pdf', size: 102400, uploadedAt: twoDaysAgo.toISOString() },
      { id: 'att-002', name: 'Deviation_Request_Form_001.docx', url: '#', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 51200, uploadedAt: twoDaysAgo.toISOString() },
    ],
    approvalSteps: [
      { level: 'Vessel Certificates' }, // Pending this step
      { level: 'Senior Director' },
      { level: 'Director General' },
    ],
    lastModified: twoDaysAgo.toISOString(),
    lastModifiedTimestamp: twoDaysAgo.getTime(),
  },
  {
    id: 'ra-002',
    referenceNumber: 'CCG-RA-2024-002',
    vesselName: 'CCGS Terry Fox',
    vesselIMO: '8127719',
    voyageDetails: 'Icebreaking Escort, St. John\'s to Strait of Belle Isle, Departs 2024-07-10',
    reasonForRequest: 'Chief Engineer certificate expired, renewal pending.',
    personnelShortages: 'Chief Engineer\'s CoC (Certificate of Competency) expired 2 days ago. Renewal paperwork submitted, awaiting issuance.',
    proposedOperationalDeviations: 'Second Engineer (holding valid CoC for the role) to assume Chief Engineer duties under remote supervision from shore-based Senior Chief Engineer. Daily operational checks to be reported.',
    submittedBy: 'Chief Officer L. Moreau',
    submissionDate: oneDayAgo.toISOString(),
    submissionTimestamp: oneDayAgo.getTime(),
    status: 'Pending Senior Director', // Vessel Certs approved, now pending SD
    attachments: [
      { id: 'att-003', name: 'TerryFox_CE_CoC_Expired.pdf', url: '#', type: 'application/pdf', size: 76800, uploadedAt: oneDayAgo.toISOString() },
      { id: 'att-004', name: 'Renewal_Application_Confirmation.png', dataAiHint:"document scan", url: 'https://placehold.co/150x100.png', type: 'image/png', size: 120000, uploadedAt: oneDayAgo.toISOString() },
    ],
    approvalSteps: [
      { level: 'Vessel Certificates', decision: 'Approved', userName: 'VC Approver', date: oneDayAgo.toISOString(), notes: 'Proceed with caution, ensure 2nd Eng is comfortable.' },
      { level: 'Senior Director' }, // Pending this step
      { level: 'Director General' },
    ],
    aiRiskScore: 65,
    aiSuggestedMitigations: 'Ensure constant communication link with shore-based Senior Chief Engineer. Implement a buddy system for critical engine room tasks. Limit vessel operations to daylight hours if possible until CoC is renewed.',
    aiRegulatoryConsiderations: 'Refer to Marine Personnel Regulations SOR/2007-115, Part 2, Division 7 regarding manning and certification. Exemption may be required under specific circumstances.',
    lastModified: oneDayAgo.toISOString(),
    lastModifiedTimestamp: oneDayAgo.getTime(),
  },
  {
    id: 'ra-003',
    referenceNumber: 'CCG-RA-2024-003',
    vesselName: 'CCGS Ann Harvey',
    vesselIMO: '8320442',
    voyageDetails: 'SAR Patrol, Halifax Sector, Continuous Operations',
    reasonForRequest: 'Proposed reduction in minimum watchkeeping personnel during non-critical phases.',
    personnelShortages: 'No current shortage, but proposing a deviation to standard watchkeeping levels to manage crew fatigue on extended patrols.',
    proposedOperationalDeviations: 'During daylight hours and in clear weather (Visibility > 5NM, Wind < Force 4), reduce bridge watch to one certified officer and one lookout, from standard two officers and one lookout. Engine room to remain UMS (Unmanned Machinery Spaces) capable.',
    submittedBy: 'Master J. Kendrick',
    submissionDate: threeDaysAgo.toISOString(),
    submissionTimestamp: threeDaysAgo.getTime(),
    status: 'Approved', // Fully approved
    attachments: [
       { id: 'att-005', name: 'FatigueManagementPlan_AnnHarvey.pdf', url: '#', type: 'application/pdf', size: 204800, uploadedAt: threeDaysAgo.toISOString() },
    ],
    approvalSteps: [
      { level: 'Vessel Certificates', decision: 'Approved', userName: 'VC Team Lead', date: twoDaysAgo.toISOString(), notes: 'Acceptable under proposed conditions.'},
      { level: 'Senior Director', decision: 'Approved', userName: 'SD maritime Ops', date: oneDayAgo.toISOString(), notes: 'Concur with VC assessment. Emphasize strict adherence.'},
      { level: 'Director General', decision: 'Approved', userName: 'DG Ops', date: oneDayAgo.toISOString(), notes: 'Approved with condition that criteria for reduced watch are strictly adhered to and logged. Bi-hourly weather checks mandatory.'},
    ],
    aiRiskScore: 30,
    aiGeneratedSummary: "Request for reduced watchkeeping on CCGS Ann Harvey during favorable conditions to manage crew fatigue. Proposes one officer and one lookout on bridge.",
    aiSuggestedMitigations: 'Implement strict criteria for "non-critical phases". Ensure immediate recall capability for full watch team. Regular fatigue assessments for watchkeepers.',
    aiRegulatoryConsiderations: 'Compliance with STCW Code Chapter VIII and Marine Personnel Regulations regarding watchkeeping arrangements and prevention of fatigue.',
    lastModified: oneDayAgo.toISOString(),
    lastModifiedTimestamp: oneDayAgo.getTime(),
  },
  {
    id: 'ra-004',
    referenceNumber: 'CCG-RA-2024-004',
    vesselName: 'CCGS Gordon Reid',
    vesselIMO: '8320454',
    voyageDetails: 'Fisheries Patrol, West Coast Vancouver Island, Departs 2024-07-12',
    reasonForRequest: 'Medical evacuation of one Able Seaman, replacement not immediately available.',
    personnelShortages: 'One Able Seaman (AS) medevaced. Vessel will be short one AS for approximately 48-72 hours.',
    proposedOperationalDeviations: 'Remaining deck crew to absorb duties. Non-essential maintenance postponed. Mooring operations to be conducted with extra caution and supervision.',
    submittedBy: 'First Mate P. Davies',
    submissionDate: now.toISOString(),
    submissionTimestamp: now.getTime(),
    status: 'Pending Vessel Certificates',
    attachments: [
      { id: 'att-006', name: 'Medevac_Report_GR001.pdf', url: '#', type: 'application/pdf', size: 95000, uploadedAt: now.toISOString() },
    ],
    approvalSteps: [
      { level: 'Vessel Certificates' }, // Pending this step
      { level: 'Senior Director' },
      { level: 'Director General' },
    ],
    lastModified: now.toISOString(),
    lastModifiedTimestamp: now.getTime(),
  },
  {
    id: 'ra-005',
    referenceNumber: 'CCG-RA-2024-005',
    vesselName: 'CCGS Sir John Franklin',
    vesselIMO: '9744441',
    voyageDetails: 'Aids to Navigation maintenance, Great Lakes, Commences 2024-08-01',
    reasonForRequest: 'Gyrocompass requires overhaul, will operate on secondary magnetic compass.',
    personnelShortages: 'N/A directly, but primary navigation system impacted.',
    proposedOperationalDeviations: 'Reliance on magnetic compass as primary heading source. Regular cross-checks with GPS and visual bearings. Restricted operations in low visibility or complex waters until gyro is repaired.',
    submittedBy: 'Capt. Sarah Chen',
    submissionDate: fourDaysAgo.toISOString(),
    submissionTimestamp: fourDaysAgo.getTime(),
    status: 'Rejected', // Rejected by Senior Director
    attachments: [
      { id: 'att-007', name: 'Gyro_Maintenance_Report.pdf', url: '#', type: 'application/pdf', size: 150000, uploadedAt: fourDaysAgo.toISOString() },
      { id: 'att-008', name: 'Proposed_Nav_Procedures.docx', url: '#', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 65000, uploadedAt: fourDaysAgo.toISOString() },
    ],
    approvalSteps: [
      { level: 'Vessel Certificates', decision: 'Approved', userName: 'VC Tech Services', date: threeDaysAgo.toISOString(), notes: 'Mitigations seem adequate for short term.'},
      { level: 'Senior Director', decision: 'Rejected', userName: 'SD Navigational Safety', date: twoDaysAgo.toISOString(), notes: 'Operating on magnetic compass alone in the Great Lakes poses too high a risk. Gyro must be repaired or vessel operations significantly curtailed to daylight, clear weather, and open waters only.'},
      { level: 'Director General' }, // Not reached
    ],
    aiRiskScore: 75,
    aiGeneratedSummary: "CCGS Sir John Franklin proposes operating with magnetic compass as primary due to gyro overhaul. Mitigations include GPS/visual checks and restricted ops in poor conditions.",
    aiSuggestedMitigations: "Prioritize gyrocompass repair. If proceeding, enhance watchkeeping, ensure all nav aids are fully operational. Consider shore-based navigational support.",
    aiRegulatoryConsiderations: "Refer to SOLAS Chapter V, Regulation 19 regarding carriage requirements for navigational equipment. Ensure compliance with Canada Shipping Act, 2001.",
    lastModified: twoDaysAgo.toISOString(),
    lastModifiedTimestamp: twoDaysAgo.getTime(),
  }
];

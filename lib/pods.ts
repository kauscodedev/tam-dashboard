// Sales Pod roster (from the GTM org chart). Each company is attributed to a pod via
// its hubspot_owner_id (`ow` on records). Owner IDs resolved against /crm/v3/owners.
// Note a few HubSpot display names differ from the roster: Anisha = Anisha Jaiswal,
// Namrata Sharma = "Nam Harrison", Vanshit Kothari = "Vans", Jaiaditya Berry = "Jay Berry".

export interface PodMember {
  name: string
  ownerId: string
  role: 'lead' | 'ae' | 'sdr'
}

export interface Pod {
  lead: string
  members: PodMember[] // includes the lead (role 'lead'), then AEs, then SDRs
}

const mk = (name: string, ownerId: string, role: PodMember['role']): PodMember => ({ name, ownerId, role })

export const PODS: Pod[] = [
  {
    lead: 'Archit Gupta',
    members: [
      mk('Archit Gupta', '67333606', 'lead'),
      mk('Liam Fallon', '160575588', 'ae'),
      mk('Anmol Sehgal', '160419465', 'ae'),
      mk('Jace Larsen', '160768701', 'ae'),
      mk('Sanamdeep', '66975998', 'sdr'),
      mk('Rajveer Singh', '69016314', 'sdr'),
      mk('utsav Yadav', '160353848', 'sdr'),
      mk('Khubaib Akram Khan', '79528942', 'sdr'),
      mk('Anisha', '160214774', 'sdr'),
      mk('Shubham Singha', '164380450', 'sdr'),
      mk('Vaansh Sharma', '160673631', 'sdr'),
      mk('Drishti Aggarwal', '160043135', 'sdr'),
    ],
  },
  {
    lead: 'Neelima Tiwari',
    members: [
      mk('Neelima Tiwari', '27537035', 'lead'),
      mk('Arun Divya Prakash', '82407666', 'ae'),
      mk('Pallav Pandey', '68537322', 'ae'),
      mk('Jatin Arora', '159882968', 'ae'),
      mk('Kshitij Agarwal', '62715106', 'sdr'),
      mk('Priyanka Sambyal', '70740200', 'sdr'),
      mk('Vikram Choudhary', '77266515', 'sdr'),
      mk('Simran Grover', '159458372', 'sdr'),
      mk('Shikhar Paroha', '79785093', 'sdr'),
    ],
  },
  {
    lead: 'Prince Arora',
    members: [
      mk('Prince Arora', '61267720', 'lead'),
      mk('Ketan Srivastava', '68537320', 'ae'),
      mk('Shadman Khalid', '79900347', 'ae'),
      mk('Divyansh Gupta', '164845034', 'ae'),
    ],
  },
  {
    lead: 'Saarthak Seth',
    members: [
      mk('Saarthak Seth', '67442992', 'lead'),
      mk('Saurabh Nawale', '69584754', 'ae'),
      mk('Shivam Ahuja', '65700806', 'ae'),
      mk('Jaiaditya Berry', '60199598', 'ae'),
      mk('Prabhjeet Kaur', '160955299', 'sdr'),
      mk('Gagandeep', '163855147', 'sdr'),
      mk('Kreeti', '164019464', 'sdr'),
      mk('Rishabh Sharma', '71105578', 'sdr'),
      mk('Viplove Tyagi', '159761343', 'sdr'),
      mk('Abhishek Bhattacharyya', '71105580', 'sdr'),
      mk('Namrata Sharma', '76546199', 'sdr'),
      mk('Lakshya', '165126708', 'sdr'),
    ],
  },
  {
    lead: 'Shashank Gupta',
    members: [
      mk('Shashank Gupta', '63973632', 'lead'),
      mk('Vanshit Kothari', '60656445', 'ae'),
      mk('Ankur Patel', '67309901', 'ae'),
      mk('Mayank Joshi', '71391271', 'ae'),
    ],
  },
]

/** ownerId → pod index, for O(1) attribution of a company record to a pod. */
export const OWNER_TO_POD: Record<string, number> = (() => {
  const map: Record<string, number> = {}
  PODS.forEach((pod, i) => pod.members.forEach((m) => { map[m.ownerId] = i }))
  return map
})()

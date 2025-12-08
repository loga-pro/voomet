// taskConfig.js
export const taskConfig = {
  'Project Initiation': [
    { name: 'Client meeting & requirement gathering', duration: 2, responsible: 'Project Manager', dependencies: [] },
    { name: 'Site visit & measurements', duration: 1, responsible: 'Designer', dependencies: [] }
  ],
  'Concept Design': [
    { name: 'Mood board preparation', duration: 3, responsible: 'Designer', dependencies: ['Client meeting & requirement gathering'] },
    { name: 'Initial layout plan', duration: 4, responsible: 'Designer', dependencies: ['Mood board preparation'] },
    { name: 'Client presentation & feedback', duration: 2, responsible: 'Designer', dependencies: ['Initial layout plan'] }
  ],
  'Design Development': [
    { name: '3D renders & walkthrough', duration: 7, responsible: '3D Artist', dependencies: ['Client presentation & feedback'] },
    { name: 'Material selection & samples', duration: 5, responsible: 'Designer', dependencies: ['Client presentation & feedback'] },
    { name: 'Cost estimation & BOQ', duration: 4, responsible: 'Estimator', dependencies: ['Material selection & samples'] }
  ],
  'Approval Phase': [
    { name: 'Final client approval', duration: 2, responsible: 'Project Manager', dependencies: ['3D renders & walkthrough', 'Cost estimation & BOQ'] },
    { name: 'Sign-off on contracts', duration: 2, responsible: 'Project Manager', dependencies: ['Final client approval'] }
  ],
  'Execution': [
    { name: 'Site preparation & demolition', duration: 5, responsible: 'Contractor', dependencies: ['Sign-off on contracts'] },
    { name: 'Civil works', duration: 10, responsible: 'Civil Engineer', dependencies: ['Site preparation & demolition'] },
    { name: 'Electrical & plumbing works', duration: 8, responsible: 'MEP Team', dependencies: ['Civil works'] },
    { name: 'False ceiling & partitions', duration: 6, responsible: 'Contractor', dependencies: ['Electrical & plumbing works'] },
    { name: 'Flooring installation', duration: 5, responsible: 'Contractor', dependencies: ['False ceiling & partitions'] },
    { name: 'Wall finishes & painting', duration: 6, responsible: 'Painter', dependencies: ['Flooring installation'] },
    { name: 'Carpentry works', duration: 10, responsible: 'Carpenter', dependencies: ['Wall finishes & painting'] },
    { name: 'Lighting installation', duration: 3, responsible: 'Electrician', dependencies: ['Carpentry works'] },
    { name: 'Furniture placement', duration: 3, responsible: 'Designer', dependencies: ['Lighting installation'] },
    { name: 'Final styling & decor', duration: 2, responsible: 'Designer', dependencies: ['Furniture placement'] }
  ],
  'Handover': [
    { name: 'Final client walkthrough', duration: 1, responsible: 'Project Manager', dependencies: ['Final styling & decor'] },
    { name: 'Snag list & rectifications', duration: 3, responsible: 'Contractor', dependencies: ['Final client walkthrough'] },
    { name: 'Final handover & documentation', duration: 1, responsible: 'Project Manager', dependencies: ['Snag list & rectifications'] }
  ]
};

export const allDependencies = [
  'Client meeting & requirement gathering',
  'Site visit & measurements',
  'Mood board preparation',
  'Initial layout plan',
  'Client presentation & feedback',
  '3D renders & walkthrough',
  'Material selection & samples',
  'Cost estimation & BOQ',
  'Final client approval',
  'Sign-off on contracts',
  'Site preparation & demolition',
  'Civil works',
  'Electrical & plumbing works',
  'False ceiling & partitions',
  'Flooring installation',
  'Wall finishes & painting',
  'Carpentry works',
  'Lighting installation',
  'Furniture placement',
  'Final styling & decor',
  'Final client walkthrough',
  'Snag list & rectifications',
  'Final handover & documentation'
];

export const phaseOptions = [
  'Project Initiation',
  'Concept Design',
  'Design Development',
  'Approval Phase',
  'Execution',
  'Handover'
];

export const statusOptions = ['Not Started', 'In Progress', 'Completed'];

export const projectStatusOptions = ['On Track', 'At Risk', 'Delayed', 'Completed'];
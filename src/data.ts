/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabUser, LabTask, LabMeeting, LabDocument } from "./types";

export const DEFAULT_USERS: LabUser[] = [
  {
    userId: "PROF_01",
    name: "Prof. Alex Wright",
    designation: "Professor (PI)",
    email: "pi@example.edu",
    phoneNumber: "+1 (555) 010-0001",
    researchDomain: "Optics and Microfluidics Instrumentation Lab",
    thesisTopic: undefined,
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "COORD_01",
    name: "Lab Coordinator",
    designation: "Coordinator",
    email: "coordinator@example.edu",
    phoneNumber: "+1 (555) 010-0002",
    researchDomain: "Laboratory Administration",
    thesisTopic: "",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_15",
    name: "Mr. Alex Rivera",
    designation: "PhD Scholar",
    email: "alex.rivera@example.edu",
    phoneNumber: "+1 (555) 010-0003",
    researchDomain: "Electronics and Communications",
    thesisTopic: "Optical Biosensors",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_09",
    name: "Mr. David Chen",
    designation: "PhD Scholar",
    email: "david.chen@example.edu",
    phoneNumber: "+1 (555) 010-0004",
    researchDomain: "Microfluidics",
    thesisTopic: "Cell Sorting Devices",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_07",
    name: "Mr. Marcus Thorne",
    designation: "PhD Scholar",
    email: "marcus.thorne@example.edu",
    phoneNumber: "+1 (555) 010-0005",
    researchDomain: "Applied Optics",
    thesisTopic: "Microscopy Automation",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_08",
    name: "Mr. Daniel Kim",
    designation: "PhD Scholar",
    email: "daniel.kim@example.edu",
    phoneNumber: "+1 (555) 010-0006",
    researchDomain: "Photonics",
    thesisTopic: "Laser Diagnostics",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_17",
    name: "Dr. Jordan Lee",
    designation: "Post Doc",
    email: "jordan.lee@example.edu",
    phoneNumber: "+1 (555) 010-0007",
    researchDomain: "Applied Optics",
    thesisTopic: "Interferometry Systems",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_06",
    name: "Ms. Elena Vance",
    designation: "PhD Scholar",
    email: "elena.vance@example.edu",
    phoneNumber: "+1 (555) 010-0008",
    researchDomain: "Biophotonics",
    thesisTopic: "Spectroscopic Imaging",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_10",
    name: "Mr. Sourish K.",
    designation: "P.G. Scholar",
    email: "sourish@example.edu",
    phoneNumber: "+1 (555) 010-0009",
    researchDomain: "Instrumentation",
    thesisTopic: "Water Quality Diagnostics",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_11",
    name: "Mr. Amit Kumar",
    designation: "PhD Scholar",
    email: "amit@example.edu",
    phoneNumber: "+1 (555) 010-0010",
    researchDomain: "Imaging Systems",
    thesisTopic: "Hyperspectral Imaging",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_13",
    name: "Mr. Noah Martinez",
    designation: "P.G. Scholar",
    email: "noah.martinez@example.edu",
    phoneNumber: "+1 (555) 010-0011",
    researchDomain: "Optics",
    thesisTopic: "Phase Retrieval Algorithms",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_14",
    name: "Mr. Evan Singh",
    designation: "P.G. Scholar",
    email: "evan.singh@example.edu",
    phoneNumber: "+1 (555) 010-0012",
    researchDomain: "Instrumentation",
    thesisTopic: "Microcontroller Acquisition",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_16",
    name: "Dr. Rachel Adams",
    designation: "Post Doc",
    email: "rachel.adams@example.edu",
    phoneNumber: "+1 (555) 010-0013",
    researchDomain: "Microfluidics",
    thesisTopic: "Lab-on-a-Chip Systems",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  },
  {
    userId: "STU_05",
    name: "Mr. Samira Patel",
    designation: "PhD Scholar",
    email: "samira.patel@example.edu",
    phoneNumber: "+1 (555) 010-0014",
    researchDomain: "Optics & Instrumentation",
    thesisTopic: "Optical Sensing",
    rosterStatus: "ACTIVE",
    pinCode: "0000"
  }
];

export const DEFAULT_TASKS: LabTask[] = [];
export const DEFAULT_MEETINGS: LabMeeting[] = [];
export const DEFAULT_DOCUMENTS: LabDocument[] = [];

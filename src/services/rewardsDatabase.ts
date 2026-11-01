/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabTask, LaneCategory, StatusMetric } from "../types";

export interface RewardCategory {
  id: string;
  categoryNumber: number;
  title: string;
  triggerDescription: string;
  psychologicalNeed: string;
  rationale: string;
  shortQuotes: string[];
  mediumQuotes: string[];
  badge: {
    name: string;
    icon: string;
    level: string;
  };
  themeColor: {
    bg: string;
    border: string;
    text: string;
    pill: string;
  };
}

export interface EarnedReward {
  rewardId: string;
  studentId: string;
  categoryId: string;
  taskId?: string;
  taskTitle?: string;
  quoteSelected: string;
  psychologicalNeed: string;
  quoteType: "short" | "medium";
  badgeName: string;
  badgeIcon: string;
  earnedAt: number;
}

/**
 * The Official 12-Category PhD Researcher Task Reward & Motivation System Database
 * Categorized by task status, duration, psychology, and milestone contexts.
 */
export const PHD_REWARD_CATEGORIES: RewardCategory[] = [
  {
    id: "short_task_early",
    categoryNumber: 1,
    title: "Short Task / Early Finish",
    triggerDescription: "Task marked completed before the deadline with short duration (< 7 days)",
    psychologicalNeed: "Momentum",
    rationale: "Gives a quick hit of dopamine to build confidence for harder tasks.",
    shortQuotes: [
      "Small wins build momentum.",
      "Quick, sharp, and done."
    ],
    mediumQuotes: [
      "You crushed that task much faster than expected!",
      "Great job knocking this out so quickly today."
    ],
    badge: {
      name: "Velocity Sprinter",
      icon: "⚡",
      level: "Momentum Tier"
    },
    themeColor: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      pill: "bg-amber-100 text-amber-800"
    }
  },
  {
    id: "long_task_early",
    categoryNumber: 2,
    title: "Long Task / Early Finish",
    triggerDescription: "Task with a long timeline (≥ 7 days) marked completed before the deadline",
    psychologicalNeed: "Validation",
    rationale: "Acknowledges intense focus and high cognitive load. Prevents burnout.",
    shortQuotes: [
      "Deep work pays off.",
      "Brilliant focus. Enjoy this."
    ],
    mediumQuotes: [
      "You completely outpaced the timeline on this beast!",
      "Incredible focus helped you conquer this massive challenge."
    ],
    badge: {
      name: "Deep Focus Master",
      icon: "🏔️",
      level: "Mastery Tier"
    },
    themeColor: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      text: "text-indigo-900",
      pill: "bg-indigo-100 text-indigo-800"
    }
  },
  {
    id: "completed_on_deadline",
    categoryNumber: 3,
    title: "Completed On Deadline",
    triggerDescription: "Task marked completed exactly on or within 24 hours of the planned end date",
    psychologicalNeed: "Reassurance",
    rationale: "Reinforces that pacing is a skill and validates consistency.",
    shortQuotes: [
      "Perfect timing. Solid execution.",
      "Consistency is your superpower."
    ],
    mediumQuotes: [
      "You delivered this perfectly right on the schedule.",
      "Steady pacing is exactly how great research happens."
    ],
    badge: {
      name: "Precision Pacer",
      icon: "🎯",
      level: "Reliability Tier"
    },
    themeColor: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-900",
      pill: "bg-emerald-100 text-emerald-800"
    }
  },
  {
    id: "completed_after_deadline",
    categoryNumber: 4,
    title: "Completed After Deadline",
    triggerDescription: "Task marked completed after the planned end date has passed",
    psychologicalNeed: "Grace",
    rationale: "Combats guilt and perfectionism. Emphasizes perseverance over arbitrary clocks.",
    shortQuotes: [
      "Done is better than perfect.",
      "You pushed through it."
    ],
    mediumQuotes: [
      "Your persistence in finishing this is what matters most.",
      "You overcame the hurdles and finally got it done."
    ],
    badge: {
      name: "Perseverance Champion",
      icon: "🛡️",
      level: "Resilience Tier"
    },
    themeColor: {
      bg: "bg-teal-50",
      border: "border-teal-200",
      text: "text-teal-900",
      pill: "bg-teal-100 text-teal-800"
    }
  },
  {
    id: "moved_planned_to_ongoing",
    categoryNumber: 5,
    title: "Moved: Planned → Ongoing",
    triggerDescription: "User changes task status from Planned to Active/Ongoing (Doing)",
    psychologicalNeed: "Activation",
    rationale: "Validates that overcoming inertia and starting is often the hardest part.",
    shortQuotes: [
      "The hardest part is starting.",
      "Trust your research process."
    ],
    mediumQuotes: [
      "Taking the very first step is a huge win.",
      "You have officially put this important work in motion."
    ],
    badge: {
      name: "Inertia Breaker",
      icon: "🚀",
      level: "Activation Tier"
    },
    themeColor: {
      bg: "bg-cyan-50",
      border: "border-cyan-200",
      text: "text-cyan-900",
      pill: "bg-cyan-100 text-cyan-800"
    }
  },
  {
    id: "stuck_in_ongoing",
    categoryNumber: 6,
    title: "Stuck in 'Ongoing' (Delayed)",
    triggerDescription: "Task remains in Ongoing status past the deadline without completion",
    psychologicalNeed: "Endurance",
    rationale: "Normalizes the fact that good science breaks, stalls, and takes time.",
    shortQuotes: [
      "Complex problems take time.",
      "Progress, not just outcomes."
    ],
    mediumQuotes: [
      "Good science takes time, so keep breathing through it.",
      "You are highly capable of figuring this out eventually."
    ],
    badge: {
      name: "Scientific Endurance",
      icon: "🧘",
      level: "Stamina Tier"
    },
    themeColor: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-900",
      pill: "bg-orange-100 text-orange-800"
    }
  },
  {
    id: "troubleshooting_failed",
    categoryNumber: 7,
    title: "Troubleshooting (Failed Experiment / Error)",
    triggerDescription: "Task is marked with RED status or tagged with 'troubleshoot', 'failed', or 'error'",
    psychologicalNeed: "Resilience",
    rationale: "Reframes failure as a normal, necessary step in methodology.",
    shortQuotes: [
      "Science is built on revisions.",
      "Every setback teaches something."
    ],
    mediumQuotes: [
      "Every setback brings you closer to the real breakthrough.",
      "Revisions are just stepping stones to your final success."
    ],
    badge: {
      name: "Resilient Experimenter",
      icon: "🔬",
      level: "Discovery Tier"
    },
    themeColor: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-900",
      pill: "bg-rose-100 text-rose-800"
    }
  },
  {
    id: "waiting_long_processes",
    categoryNumber: 8,
    title: "Waiting on Long Processes (Simulations/Assays)",
    triggerDescription: "Task is tagged as 'waiting', 'incubating', or 'simulation'",
    psychologicalNeed: "Patience",
    rationale: "Validates the passive waiting period as active progress.",
    shortQuotes: [
      "Good science requires patient waiting.",
      "Active waiting is still progress."
    ],
    mediumQuotes: [
      "Great results take time; enjoy a quick break today!",
      "This incubation period is essential for your brilliant data."
    ],
    badge: {
      name: "Incubation Anchor",
      icon: "⏳",
      level: "Patience Tier"
    },
    themeColor: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-900",
      pill: "bg-purple-100 text-purple-800"
    }
  },
  {
    id: "addressing_feedback",
    categoryNumber: 9,
    title: "Addressing PI / Reviewer Feedback",
    triggerDescription: "Task has PI review status 'Revision Requested' or moved back to Ongoing after critique",
    psychologicalNeed: "Growth",
    rationale: "Keeps motivation high when a task requires corrections.",
    shortQuotes: [
      "Feedback refines your brilliant ideas.",
      "Embrace the editing process."
    ],
    mediumQuotes: [
      "Polishing your work makes the final results shine brighter.",
      "Every single critique makes your research significantly more robust."
    ],
    badge: {
      name: "Scholarly Refiner",
      icon: "💎",
      level: "Growth Tier"
    },
    themeColor: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      pill: "bg-blue-100 text-blue-800"
    }
  },
  {
    id: "clearing_lab_chores",
    categoryNumber: 10,
    title: "Clearing Lab Chores & Admin Tasks",
    triggerDescription: "Task tagged as 'admin', 'inventory', or 'cleanup' is completed",
    psychologicalNeed: "Order",
    rationale: "Gives a sense of accomplishment for maintaining research infrastructure.",
    shortQuotes: [
      "Clear space, clear researcher mind.",
      "Infrastructure enables great science."
    ],
    mediumQuotes: [
      "Small organized steps lay the groundwork for major discoveries.",
      "Taking care of the details keeps the lab running smoothly."
    ],
    badge: {
      name: "Laboratory Pillar",
      icon: "🧹",
      level: "Foundation Tier"
    },
    themeColor: {
      bg: "bg-slate-100",
      border: "border-slate-300",
      text: "text-slate-800",
      pill: "bg-slate-200 text-slate-700"
    }
  },
  {
    id: "data_analysis_plotting",
    categoryNumber: 11,
    title: "Finalizing Data Analysis & Plotting",
    triggerDescription: "Task tagged as 'analysis', 'plotting', or 'dataset' is completed",
    psychologicalNeed: "Excitement",
    rationale: "Celebrates the moment raw data transforms into a cohesive story.",
    shortQuotes: [
      "Your hard data looks beautiful!",
      "The story is coming together."
    ],
    mediumQuotes: [
      "Seeing the puzzle pieces finally connect is truly thrilling!",
      "You transformed raw numbers into a highly compelling narrative."
    ],
    badge: {
      name: "Data Alchemist",
      icon: "📈",
      level: "Insight Tier"
    },
    themeColor: {
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-200",
      text: "text-fuchsia-900",
      pill: "bg-fuchsia-100 text-fuchsia-800"
    }
  },
  {
    id: "major_milestone",
    categoryNumber: 12,
    title: "Major Milestone (Chapter / Paper Submitted)",
    triggerDescription: "Task flagged as 'milestone', 'submission', 'thesis', or 'publication' is completed",
    psychologicalNeed: "Celebration",
    rationale: "Ensures researchers pause to acknowledge a massive cognitive effort.",
    shortQuotes: [
      "Celebrate this massive milestone today!",
      "You earned this incredible win."
    ],
    mediumQuotes: [
      "You achieved something extraordinary; take time to celebrate properly!",
      "Pause and reflect on this massive leap forward today."
    ],
    badge: {
      name: "Milestone Legend",
      icon: "🏆",
      level: "Apex Tier"
    },
    themeColor: {
      bg: "bg-gradient-to-r from-amber-50 to-yellow-100",
      border: "border-yellow-400",
      text: "text-yellow-950",
      pill: "bg-yellow-200 text-yellow-900"
    }
  }
];

/**
 * Access Control Check: PhD Task Rewards Database is strictly for
 * other people EXCEPT PI and COORDINATOR.
 */
export function isAllowedRewardAccess(userRole?: string): boolean {
  if (!userRole) return false;
  const normalized = userRole.toLowerCase().trim();
  if (normalized.includes("professor") || normalized.includes("pi")) return false;
  if (normalized.includes("coordinator")) return false;
  return true;
}

/**
 * Evaluates which trigger category matches a task event or status transition.
 */
export function evaluateTaskRewardTrigger(
  task: LabTask,
  event: "lane_changed" | "status_changed" | "completed" | "evaluated",
  previousLane?: LaneCategory
): RewardCategory | null {
  const tag = (task.taskTag || "").toLowerCase();
  const title = (task.title || "").toLowerCase();
  const combinedText = `${tag} ${title}`;
  const now = Date.now();
  const deadline = task.revisedEndDate || task.expectedEndDate;
  const durationDays = (deadline - task.startDate) / (1000 * 60 * 60 * 24);

  // 1. Completion Triggers
  if (task.laneCategory === "Completed" || event === "completed") {
    // Check Major Milestone (Trigger 12)
    if (
      combinedText.includes("milestone") ||
      combinedText.includes("submission") ||
      combinedText.includes("paper") ||
      combinedText.includes("chapter") ||
      combinedText.includes("thesis") ||
      combinedText.includes("publication")
    ) {
      return PHD_REWARD_CATEGORIES.find((c) => c.id === "major_milestone") || null;
    }

    // Check Data Analysis & Plotting (Trigger 11)
    if (
      combinedText.includes("analysis") ||
      combinedText.includes("plotting") ||
      combinedText.includes("plot") ||
      combinedText.includes("dataset") ||
      combinedText.includes("graph")
    ) {
      return PHD_REWARD_CATEGORIES.find((c) => c.id === "data_analysis_plotting") || null;
    }

    // Check Lab Chores & Admin (Trigger 10)
    if (
      combinedText.includes("admin") ||
      combinedText.includes("inventory") ||
      combinedText.includes("cleanup") ||
      combinedText.includes("chore") ||
      combinedText.includes("order")
    ) {
      return PHD_REWARD_CATEGORIES.find((c) => c.id === "clearing_lab_chores") || null;
    }

    // Check Timelines vs Completion
    const completionTimestamp = task.actualCompletionDate || now;
    const diffHours = (deadline - completionTimestamp) / (1000 * 60 * 60);

    // Completed significantly before deadline (> 12 hours early)
    if (diffHours > 12) {
      if (durationDays >= 7) {
        // Long Task / Early Finish (Trigger 2)
        return PHD_REWARD_CATEGORIES.find((c) => c.id === "long_task_early") || null;
      } else {
        // Short Task / Early Finish (Trigger 1)
        return PHD_REWARD_CATEGORIES.find((c) => c.id === "short_task_early") || null;
      }
    }

    // Completed on deadline (within +/- 12 hours of deadline)
    if (Math.abs(diffHours) <= 12) {
      return PHD_REWARD_CATEGORIES.find((c) => c.id === "completed_on_deadline") || null;
    }

    // Completed after deadline
    if (completionTimestamp > deadline) {
      return PHD_REWARD_CATEGORIES.find((c) => c.id === "completed_after_deadline") || null;
    }
  }

  // 2. Moved Planned → Ongoing (Trigger 5)
  if (task.laneCategory === "Doing" && (previousLane === "Planned" || event === "lane_changed")) {
    return PHD_REWARD_CATEGORIES.find((c) => c.id === "moved_planned_to_ongoing") || null;
  }

  // 3. PI Review Revision / Addressing Feedback (Trigger 9)
  if (task.professorReviewStatus === "Revision Requested") {
    return PHD_REWARD_CATEGORIES.find((c) => c.id === "addressing_feedback") || null;
  }

  // 4. Troubleshooting / Failed Experiment / RED status (Trigger 7)
  if (
    task.currentStatus === "RED" ||
    combinedText.includes("troubleshoot") ||
    combinedText.includes("failed") ||
    combinedText.includes("error")
  ) {
    return PHD_REWARD_CATEGORIES.find((c) => c.id === "troubleshooting_failed") || null;
  }

  // 5. Waiting on Long Processes (Trigger 8)
  if (
    combinedText.includes("waiting") ||
    combinedText.includes("incubating") ||
    combinedText.includes("simulation") ||
    combinedText.includes("assay")
  ) {
    return PHD_REWARD_CATEGORIES.find((c) => c.id === "waiting_long_processes") || null;
  }

  // 6. Stuck in Ongoing / Delayed (Trigger 6)
  if (task.laneCategory === "Doing" && now > deadline) {
    return PHD_REWARD_CATEGORIES.find((c) => c.id === "stuck_in_ongoing") || null;
  }

  return null;
}

/**
 * Returns a fresh alternating quote from the category.
 */
export function getRewardQuote(
  category: RewardCategory,
  preferredType: "short" | "medium" = "medium"
): { quote: string; type: "short" | "medium" } {
  const quotes = preferredType === "short" ? category.shortQuotes : category.mediumQuotes;
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return {
    quote: quotes[randomIndex] || category.mediumQuotes[0],
    type: preferredType
  };
}

/**
 * Computes scholar's unlocked badges and reward metrics from their task history.
 */
export function calculateScholarRewardProfile(tasks: LabTask[], studentId: string) {
  const scholarTasks = tasks.filter((t) => t.studentId === studentId);
  const completed = scholarTasks.filter((t) => t.laneCategory === "Completed");
  const ongoing = scholarTasks.filter((t) => t.laneCategory === "Doing");
  const now = Date.now();

  const unlockedBadges: { category: RewardCategory; taskTitle?: string; date: number }[] = [];

  scholarTasks.forEach((t) => {
    const matched = evaluateTaskRewardTrigger(t, "evaluated");
    if (matched && !unlockedBadges.some((b) => b.category.id === matched.id)) {
      unlockedBadges.push({
        category: matched,
        taskTitle: t.title,
        date: t.actualCompletionDate || now
      });
    }
  });

  // Calculate researcher level based on total activities and completions
  const score = completed.length * 15 + ongoing.length * 5;
  let level = "Doctoral Explorer";
  if (score >= 60) level = "Principal Research Fellow";
  else if (score >= 40) level = "Senior Doctoral Candidate";
  else if (score >= 20) level = "Autonomous Investigator";

  // Provide an active inspiration quote based on current situation
  let recommendedCategory: RewardCategory = PHD_REWARD_CATEGORIES[0];
  const overdueOngoing = ongoing.find((t) => now > (t.revisedEndDate || t.expectedEndDate));
  const redTask = scholarTasks.find((t) => t.currentStatus === "RED");
  const revisionTask = scholarTasks.find((t) => t.professorReviewStatus === "Revision Requested");

  if (revisionTask) {
    recommendedCategory = PHD_REWARD_CATEGORIES.find((c) => c.id === "addressing_feedback")!;
  } else if (redTask) {
    recommendedCategory = PHD_REWARD_CATEGORIES.find((c) => c.id === "troubleshooting_failed")!;
  } else if (overdueOngoing) {
    recommendedCategory = PHD_REWARD_CATEGORIES.find((c) => c.id === "stuck_in_ongoing")!;
  } else if (ongoing.length > 0) {
    recommendedCategory = PHD_REWARD_CATEGORIES.find((c) => c.id === "moved_planned_to_ongoing")!;
  } else if (completed.length > 0) {
    recommendedCategory = PHD_REWARD_CATEGORIES.find((c) => c.id === "completed_on_deadline")!;
  }

  const { quote, type } = getRewardQuote(recommendedCategory, "medium");

  return {
    level,
    score,
    completedCount: completed.length,
    ongoingCount: ongoing.length,
    unlockedBadges,
    currentInspiration: {
      category: recommendedCategory,
      quote,
      type
    }
  };
}


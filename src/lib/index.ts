// Components
export { default as BottomNav } from './components/BottomNav.svelte';
export { default as Header } from './components/Header.svelte';
export { default as HabitCard } from './components/HabitCard.svelte';
export { default as HabitForm } from './components/HabitForm.svelte';
export { default as MonsterDisplay } from './components/MonsterDisplay.svelte';
export { default as ProgressRing } from './components/ProgressRing.svelte';
export { default as StatsCard } from './components/StatsCard.svelte';
export { default as WeeklyChart } from './components/WeeklyChart.svelte';

// Stores
export { habits, todaysProgress, sortedHabits } from './stores/habits';

// Data and types
export {
	mockHabits,
	mockMonster,
	mockStats,
	habitColors,
	habitEmojis,
	monsterStages,
	type Habit,
	type Monster,
	type Stats,
	type WeeklyDataPoint
} from './data/mockData';

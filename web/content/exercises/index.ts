import {kubernetesExercises} from './kubernetes';
import type {ExerciseSet} from './kubernetes';

export type {ExerciseSet};

export function getExerciseSets(course: string): ExerciseSet[] {
  return course === 'kubernetes' ? kubernetesExercises : [];
}

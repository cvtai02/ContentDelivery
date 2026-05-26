import { getSectionTargetId as dbGetSectionTargetId } from '@/lib/db';

export function getSectionTargetId(section: string): string | undefined {
  return dbGetSectionTargetId(section) ?? undefined;
}

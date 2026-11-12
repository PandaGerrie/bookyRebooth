-- Column may already exist from a partially applied attempt.
-- Backfill per entity by createdAt (MySQL 8 window functions).
UPDATE `Flow` AS f
JOIN (
  SELECT
    `id`,
    (ROW_NUMBER() OVER (
      PARTITION BY `entityId`
      ORDER BY `createdAt` ASC, `id` ASC
    ) - 1) AS `nextOrder`
  FROM `Flow`
) AS ranked ON ranked.`id` = f.`id`
SET f.`sortOrder` = ranked.`nextOrder`;

-- CreateIndex
CREATE INDEX `Flow_entityId_sortOrder_idx` ON `Flow`(`entityId`, `sortOrder`);

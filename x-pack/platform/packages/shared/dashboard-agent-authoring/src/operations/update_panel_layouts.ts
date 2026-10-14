/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard, removePanelsFromDashboard } from '../dashboard_state';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { defineOperation } from './types';

export const updatePanelLayoutsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('update_panel_layouts'),
    panels: z
      .array(
        z.object({
          panelId: z.string().max(256).describe('ID of the panel to move.'),
          sectionId: z
            .string()
            .max(256)
            .nullable()
            .describe(
              'Move panel to an existing section id or the key of an add_section earlier in this call. null promotes to top level.'
            ),
        })
      )
      .min(1)
      .describe('Panels to move between sections. Positions and sizes are set automatically.'),
  }),
  handler: ({ dashboardData, operation, context }) => {
    let nextDashboardData = dashboardData;

    for (const { panelId, sectionId } of operation.panels) {
      const { dashboardData: dashboardAfterRemoval, removedPanels } = removePanelsFromDashboard({
        dashboardData: nextDashboardData,
        panelIdsToRemove: [panelId],
      });

      if (removedPanels.length === 0) {
        context.failures.push({
          type: DASHBOARD_FAILURE_TYPES.updatePanelLayouts,
          identifier: panelId,
          error: `Panel "${panelId}" not found.`,
        });
        continue;
      }

      nextDashboardData = appendPanelsToDashboard({
        dashboardData: dashboardAfterRemoval,
        panelsToAdd: removedPanels,
        // sectionId targets a section; null promotes the panel to the top level
        sectionId: sectionId ?? undefined,
      });
    }

    return nextDashboardData;
  },
});

import { db } from "@/lib/config/database/connection";
import { Prisma } from '@prisma/client';
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor';

import { SITE_NAME } from '@/lib/config/site/constants';
import { snapshotProfileBeforeSave } from '@/lib/templates/revisions/template-revisions';
import { apiHandler } from '@/lib/api/handler';
import { cleanCss } from '@/lib/utils/sanitization/css';
import { sourceTooLong } from '@/lib/templates/limits';
import { layoutFields, siteStylesOn } from '@/lib/domain/profile/layout';
import { PAGE_LOOK_SELECT, changesPageLook, pageUpdatedNow, sharePageUpdate } from '@/lib/domain/profile/page-updates';



export default apiHandler(
  { methods: ['GET', 'POST', 'DELETE'], auth: 'user', rateLimit: 'template_editing' },
  async (req, res, { user }) => {
    try {
      const { username } = req.query;
    
      if (typeof username !== 'string') {
        return res.status(400).json({ error: 'Invalid username' });
      }

      if (req.method === 'GET') {
        // Get existing template
        // Check if user can access this template
        const handle = await db.handle.findFirst({
          where: { handle: username, host: SITE_NAME },
          include: { user: { select: { id: true, primaryHandle: true } } }
        });

        if (!handle) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Only allow access to own template
        const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
        if (currentUsername !== username && user.id !== handle.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Get template from profile
        const profile = await db.profile.findUnique({
          where: { userId: handle.user.id },
          select: { customTemplate: true }
        });

        return res.status(200).json({
          template: profile?.customTemplate || null
        });

      } else if (req.method === 'POST') {
        // Save template
        const { template, customCSS, cssMode } = req.body;

        if (typeof template !== 'string') {
          return res.status(400).json({ error: 'Invalid template data' });
        }
        if (customCSS !== undefined && typeof customCSS !== 'string') {
          return res.status(400).json({ error: 'Invalid CSS' });
        }
        const tooLong = sourceTooLong('template', template) ?? sourceTooLong('CSS', customCSS);
        if (tooLong) return res.status(413).json({ error: tooLong });
        // Same sanitizer as every other CSS save
        const safeCSS = customCSS === undefined ? undefined : cleanCss(customCSS);

        // The same compile the editor's preview runs; it takes out site
        // navigation tags, which come from the profile's settings instead
        const compiledSource = await compileForEditor(template);
        if (!compiledSource.ok) return res.status(400).json(compiledSource.body);
        const { template: cleanedTemplate, compiled: compiledResult } = compiledSource;

        // Check if user can modify this profile
        const handle = await db.handle.findFirst({
          where: { handle: username, host: SITE_NAME },
          include: { user: { select: { id: true, primaryHandle: true } } }
        });

        if (!handle) {
          return res.status(404).json({ error: 'User not found' });
        }

        const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
        if (currentUsername !== username && user.id !== handle.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const before = await db.profile.findUnique({
          where: { userId: handle.user.id },
          select: PAGE_LOOK_SELECT
        });
        const siteStyles = cssMode !== undefined ? layoutFields({ siteStyles: siteStylesOn(cssMode) }) : {};
        const changed = changesPageLook(before, {
          customTemplate: cleanedTemplate,
          ...(safeCSS !== undefined && { customCSS: safeCSS }),
          ...siteStyles
        });

        // Keep a restore point of what this save is about to overwrite
        await snapshotProfileBeforeSave(handle.user.id, 'template-save');

        // Update or create the profile with its source and compiled copy
        const fields = {
          customTemplate: cleanedTemplate, // Save cleaned template without navigation
          // The page's one compiled copy: what it renders from
          compiledTemplate: JSON.parse(JSON.stringify(compiledResult)),
          templateCompiledAt: new Date(),
          ...(safeCSS !== undefined && { customCSS: safeCSS }),
          ...siteStyles,
          ...(changed && pageUpdatedNow())
        };
        await db.profile.upsert({
          where: { userId: handle.user.id },
          update: fields,
          create: { userId: handle.user.id, ...fields }
        });

        // "Share this update in the feed", ticked, and the page did change
        const shared = req.body.shareToFeed === true && changed
          ? await sharePageUpdate(handle.user.id)
          : false;

        // Anti-silent-failure contract: the editor must be able to tell the
        // user what was stripped or warned about, not just "saved".
        return res.status(200).json({
          success: true,
          shared,
          pageChanged: changed,
          warnings: compiledResult?.warnings ?? [],
          strippedComponents: compiledResult?.strippedComponents ?? []
        });

      } else if (req.method === 'DELETE') {
        // Remove template
        const handle = await db.handle.findFirst({
          where: { handle: username, host: SITE_NAME },
          include: { user: { select: { id: true, primaryHandle: true } } }
        });

        if (!handle) {
          return res.status(404).json({ error: 'User not found' });
        }

        const currentUsername = user.primaryHandle ? user.primaryHandle.split('@')[0] : null;
        if (currentUsername !== username && user.id !== handle.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const before = await db.profile.findUnique({
          where: { userId: handle.user.id },
          select: PAGE_LOOK_SELECT
        });

        // Keep a restore point before wiping the template
        await snapshotProfileBeforeSave(handle.user.id, 'reset');

        // Remove the template and its compiled copy
        await db.profile.updateMany({
          where: { userId: handle.user.id },
          data: {
            customTemplate: null,
            compiledTemplate: Prisma.JsonNull,
            templateCompiledAt: null,
            ...(changesPageLook(before, { customTemplate: null }) && pageUpdatedNow())
          }
        });

        return res.status(200).json({ success: true });

      }

    } catch (error) {
      console.error('Template API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

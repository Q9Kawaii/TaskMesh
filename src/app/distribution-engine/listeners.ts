// ============================================================================
// Distribution Engine — Firestore Listeners (Signals)
// ============================================================================
// These real-time listeners act as the equivalent of Django signals.
// They watch for changes in the `requests` and `leads` collections
// and automatically trigger the distribution engine.
//
// Engine Trigger: Firestore onSnapshot on new/modified unassigned documents.
// ============================================================================

import { Injectable, inject, OnDestroy } from '@angular/core';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DistributionService } from './service';

@Injectable({ providedIn: 'root' })
export class DistributionListeners implements OnDestroy {
  private distributionService = inject(DistributionService);

  private unsubscribeTokens: Unsubscribe | null = null;
  private unsubscribeLeads: Unsubscribe | null = null;
  private unsubscribeTokenClose: Unsubscribe | null = null;
  private unsubscribeLeadClose: Unsubscribe | null = null;

  private isRunning = false;

  /** Set of token IDs currently being processed to prevent duplicate triggers */
  private processingTokens = new Set<string>();
  private processingLeads = new Set<string>();

  /**
   * Start all real-time listeners.
   * Call this once at application startup from AppComponent.
   */
  startListening(): void {
    if (this.isRunning) {
      console.warn('🤖 [Listeners] Already running — skipping duplicate start.');
      return;
    }

    this.isRunning = true;
    console.log('🤖 [Listeners] Distribution Engine listeners activated (Greedy Weighted Scoring).');

    this.listenForNewTokens();
    this.listenForClosedTokens();
    this.listenForNewLeads();
    this.listenForClosedLeads();
  }

  /**
   * Stop all listeners and clean up subscriptions.
   */
  stopListening(): void {
    this.unsubscribeTokens?.();
    this.unsubscribeLeads?.();
    this.unsubscribeTokenClose?.();
    this.unsubscribeLeadClose?.();

    this.unsubscribeTokens = null;
    this.unsubscribeLeads = null;
    this.unsubscribeTokenClose = null;
    this.unsubscribeLeadClose = null;

    this.isRunning = false;
    console.log('🤖 [Listeners] All distribution listeners stopped.');
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  // ─── Token Listeners ─────────────────────────────────────────────────

  /**
   * Watch for new/unassigned tokens (requests).
   * Extracts required_skills[] from the document, falling back to
   * [category] or [type] as a single-skill array for backward compatibility.
   */
  private listenForNewTokens(): void {
    const requestsRef = collection(db, 'requests');
    // Temporarily listen to ALL requests to debug if the 'where' clause is failing silently
    const pendingQuery = query(requestsRef);

    this.unsubscribeTokens = onSnapshot(pendingQuery, (snapshot) => {
      console.log(`🤖 [Listeners] onSnapshot fired — ${snapshot.docChanges().length} changes, ${snapshot.docs.length} total docs`);
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const tokenId = change.doc.id;

          // Skip if already assigned or currently being processed
          if (data['assignedTo'] || data['assignedEmployee']) return;
          if (this.processingTokens.has(tokenId)) return;

          this.processingTokens.add(tokenId);

          try {
            // Extract required_skills: prefer array, fall back to category/type
            const requiredSkills = this.extractSkillsFromDoc(data);

            console.log(
              `🤖 [Listeners] New unassigned token detected: ${tokenId}` +
              (requiredSkills.length > 0 ? ` (skills: [${requiredSkills.join(', ')}])` : '')
            );

            await this.distributionService.assignToken(tokenId, requiredSkills);
          } catch (error: any) {
            console.error(
              `🚨 [Listeners] Failed to auto-assign token ${tokenId}:`,
              error.message
            );
          } finally {
            this.processingTokens.delete(tokenId);
          }
        }
      });
    }, (error) => {
      console.error('🚨 [Listeners] onSnapshot ERROR (likely Firestore rules):', error.code, error.message);
    });
  }

  /**
   * Watch for tokens that get closed/resolved.
   */
  private listenForClosedTokens(): void {
    const requestsRef = collection(db, 'requests');
    const closedQuery = query(
      requestsRef,
      where('status', 'in', ['resolved', 'closed', 'completed'])
    );

    this.unsubscribeTokenClose = onSnapshot(closedQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const tokenId = change.doc.id;

          try {
            await this.distributionService.releaseToken(tokenId);
          } catch (error: any) {
            console.error(
              `🚨 [Listeners] Failed to release token ${tokenId}:`,
              error.message
            );
          }
        }
      });
    });
  }

  // ─── Lead Listeners ──────────────────────────────────────────────────

  /**
   * Watch for new/unassigned leads.
   * Extracts required_skills from the document data.
   */
  private listenForNewLeads(): void {
    const leadsRef = collection(db, 'leads');
    const newLeadQuery = query(
      leadsRef,
      where('status', 'in', ['new', 'unassigned'])
    );

    this.unsubscribeLeads = onSnapshot(newLeadQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const leadId = change.doc.id;

          if (data['assigned_employee']) return;
          if (this.processingLeads.has(leadId)) return;

          this.processingLeads.add(leadId);

          try {
            const requiredSkills = this.extractSkillsFromDoc(data);

            console.log(
              `🤖 [Listeners] New unassigned lead detected: ${leadId}` +
              (requiredSkills.length > 0 ? ` (skills: [${requiredSkills.join(', ')}])` : '')
            );

            await this.distributionService.assignLead(leadId, requiredSkills);
          } catch (error: any) {
            console.error(
              `🚨 [Listeners] Failed to auto-assign lead ${leadId}:`,
              error.message
            );
          } finally {
            this.processingLeads.delete(leadId);
          }
        }
      });
    });
  }

  /**
   * Watch for leads that get converted/archived.
   */
  private listenForClosedLeads(): void {
    const leadsRef = collection(db, 'leads');
    const closedQuery = query(
      leadsRef,
      where('status', 'in', ['converted', 'archived', 'closed'])
    );

    this.unsubscribeLeadClose = onSnapshot(closedQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const leadId = change.doc.id;

          try {
            await this.distributionService.releaseLead(leadId);
          } catch (error: any) {
            console.error(
              `🚨 [Listeners] Failed to release lead ${leadId}:`,
              error.message
            );
          }
        }
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Extract required skills from a Firestore document.
   * Priority: required_skills[] → [required_skill] → [category] → [type] → []
   */
  private extractSkillsFromDoc(data: Record<string, any>): string[] {
    if (Array.isArray(data['required_skills']) && data['required_skills'].length > 0) {
      return data['required_skills'] as string[];
    }
    if (data['required_skill'] && typeof data['required_skill'] === 'string') {
      return [data['required_skill']];
    }
    if (data['category'] && typeof data['category'] === 'string') {
      return [data['category']];
    }
    if (data['type'] && typeof data['type'] === 'string') {
      return [data['type']];
    }
    return [];
  }
}

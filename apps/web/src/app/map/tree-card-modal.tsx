'use client';

import { colorByTrackingStatus } from '@arbolapp/core';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import type { TreeCard } from '@/features/public-map';
import { X, AlertCircle } from 'lucide-react';

interface TreeCardModalProps {
  isLoading: boolean;
  treeCard: TreeCard | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

/**
 * Modal showing complete tree details when a marker is tapped.
 *
 * The photograph is a signed URL ready to use (photoUrl).
 * No additional signing needed on the client.
 */
export function TreeCardModal({
  isLoading,
  treeCard,
  error,
  onClose,
  onRetry,
}: TreeCardModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-ink/45" onClick={onClose} role="presentation" />

      {/* Modal */}
      <div
        className="shadow-overlay fixed top-0 right-0 z-50 flex h-full w-full flex-col overflow-y-auto bg-surface-overlay md:w-96"
        role="dialog"
        aria-labelledby="tree-card-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border-subtle p-4">
          <h2 id="tree-card-title" className="font-subheading font-semibold text-text-primary">
            {texts.publicMap.treeCard.title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={texts.publicMap.treeCard.close}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          {isLoading && (
            <div role="status" className="flex items-center justify-center py-8">
              <p className="text-text-secondary">{texts.common.loading}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded border border-danger bg-danger-soft p-4">
              <div className="flex gap-3">
                <AlertCircle
                  size={20}
                  aria-hidden="true"
                  className="mt-0.5 flex-shrink-0 text-destructive"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {texts.states.loadFailedTitle}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">{error}</p>
                  <Button variant="secondary" className="mt-3" onClick={onRetry}>
                    {texts.common.retry}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {treeCard && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full border-2 border-surface-overlay"
                  style={{
                    backgroundColor:
                      colorByTrackingStatus[treeCard.trackingStatus] ||
                      colorByTrackingStatus.up_to_date,
                  }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.status}
                  </p>
                  <p className="font-semibold text-text-primary">
                    {texts.publicMap.states[treeCard.trackingStatus]}
                  </p>
                </div>
              </div>

              {/* Tree code */}
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">
                  {texts.publicMap.treeCard.code}
                </p>
                <p className="font-mono text-lg font-semibold text-text-primary">{treeCard.code}</p>
              </div>

              {/* Species */}
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wide">
                  {texts.publicMap.treeCard.species}
                </p>
                <p className="font-medium text-text-primary">{treeCard.species}</p>
                {treeCard.speciesOriginal && (
                  <p className="text-sm text-text-secondary mt-1">
                    <span className="text-xs uppercase tracking-wide">
                      {texts.publicMap.treeCard.speciesOriginal}:
                    </span>{' '}
                    {treeCard.speciesOriginal}
                  </p>
                )}
              </div>

              {/* Location */}
              {(treeCard.location.vereda || treeCard.location.municipality) && (
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.location}
                  </p>
                  <div className="space-y-1 text-sm text-text-primary">
                    {treeCard.location.vereda && (
                      <p>
                        <span className="text-xs text-text-secondary">
                          {texts.publicMap.treeCard.village}:
                        </span>{' '}
                        {treeCard.location.vereda}
                      </p>
                    )}
                    {treeCard.location.municipality && (
                      <p>
                        <span className="text-xs text-text-secondary">
                          {texts.publicMap.treeCard.municipality}:
                        </span>{' '}
                        {treeCard.location.municipality}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Guardian */}
              {treeCard.guardianName && (
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.guardian}
                  </p>
                  <p className="font-medium text-text-primary">{treeCard.guardianName}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.planted}
                  </p>
                  <p className="font-medium text-text-primary">
                    {treeCard.plantedAt
                      ? new Date(treeCard.plantedAt).toLocaleDateString('es-CO')
                      : texts.common.noValue}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.lastUpdated}
                  </p>
                  <p className="font-medium text-text-primary">
                    {treeCard.lastUpdatedAt
                      ? new Date(treeCard.lastUpdatedAt).toLocaleDateString('es-CO')
                      : texts.common.noValue}
                  </p>
                </div>
              </div>

              {/* Cycle */}
              {treeCard.cycle !== null && (
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.cycle}
                  </p>
                  <p className="font-medium text-text-primary">
                    {treeCard.cycle > 0 ? treeCard.cycle : texts.publicMap.treeCard.noCycle}
                  </p>
                </div>
              )}

              {/* Photo placeholder */}
              {treeCard.photoUrl ? (
                <div className="bg-border-subtle rounded aspect-video flex items-center justify-center">
                  <p className="text-sm text-text-secondary">{texts.publicMap.treeCard.noPhoto}</p>
                </div>
              ) : (
                <div className="bg-border-subtle rounded p-3">
                  <p className="text-xs text-text-secondary">{texts.publicMap.treeCard.noPhoto}</p>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && !treeCard && (
            <div className="text-center py-8">
              <p className="text-text-secondary">{texts.states.notAvailableYet}</p>
            </div>
          )}
        </div>

        {/* Footer with close button on mobile */}
        <div className="flex-shrink-0 border-t border-border-subtle p-4 md:hidden">
          <Button variant="secondary" block onClick={onClose}>
            {texts.publicMap.treeCard.close}
          </Button>
        </div>
      </div>
    </>
  );
}

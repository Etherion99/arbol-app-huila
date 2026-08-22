'use client';

import { colorByTrackingStatus } from '@arbolapp/core';
import { texts } from '@/constants/texts';
import type { TreeCard } from '@/features/public-map';
import { X, AlertCircle } from 'lucide-react';

interface TreeCardModalProps {
  treeId: string;
  isLoading: boolean;
  treeCard: TreeCard | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

/**
 * Modal showing complete tree details when a marker is tapped.
 *
 * The photograph travels as an object key (photoPath), not as a signed URL.
 * The bucket is private, so the client must sign the URL once the modal opens
 * (not shown here, as that's an image service concern).
 */
export function TreeCardModal({
  treeId,
  isLoading,
  treeCard,
  error,
  onClose,
  onRetry,
}: TreeCardModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div
        className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-lg z-50 overflow-y-auto flex flex-col"
        role="dialog"
        aria-labelledby="tree-card-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-borderSubtle flex-shrink-0">
          <h2 id="tree-card-title" className="font-semibold text-textPrimary">
            {texts.publicMap.treeCard.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfaceRaised rounded transition-colors"
            aria-label={texts.publicMap.treeCard.close}
          >
            <X size={20} className="text-textSecondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <p className="text-textSecondary">{texts.common.loading}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 text-sm">
                    {texts.states.loadFailedTitle}
                  </p>
                  <p className="text-red-700 text-xs mt-1">{error}</p>
                  <button
                    onClick={onRetry}
                    className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
                  >
                    {texts.common.retry}
                  </button>
                </div>
              </div>
            </div>
          )}

          {treeCard && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white flex-shrink-0"
                  style={{
                    backgroundColor:
                      colorByTrackingStatus[treeCard.trackingStatus] ||
                      colorByTrackingStatus.up_to_date,
                  }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-textSecondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.status}
                  </p>
                  <p className="font-semibold text-textPrimary">
                    {texts.publicMap.states[treeCard.trackingStatus]}
                  </p>
                </div>
              </div>

              {/* Tree code */}
              <div>
                <p className="text-xs text-textSecondary uppercase tracking-wide">
                  {texts.publicMap.treeCard.code}
                </p>
                <p className="font-mono text-lg font-semibold text-textPrimary">
                  {treeCard.code}
                </p>
              </div>

              {/* Species */}
              <div>
                <p className="text-xs text-textSecondary uppercase tracking-wide">
                  {texts.publicMap.treeCard.species}
                </p>
                <p className="font-medium text-textPrimary">{treeCard.species}</p>
                {treeCard.speciesOriginal && (
                  <p className="text-sm text-textSecondary mt-1">
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
                  <p className="text-xs text-textSecondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.location}
                  </p>
                  <div className="space-y-1 text-sm text-textPrimary">
                    {treeCard.location.vereda && (
                      <p>
                        <span className="text-xs text-textSecondary">
                          {texts.publicMap.treeCard.village}:
                        </span>{' '}
                        {treeCard.location.vereda}
                      </p>
                    )}
                    {treeCard.location.municipality && (
                      <p>
                        <span className="text-xs text-textSecondary">
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
                  <p className="text-xs text-textSecondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.guardian}
                  </p>
                  <p className="font-medium text-textPrimary">{treeCard.guardianName}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-textSecondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.planted}
                  </p>
                  <p className="font-medium text-textPrimary">
                    {treeCard.plantedAt
                      ? new Date(treeCard.plantedAt).toLocaleDateString('es-CO')
                      : texts.common.noValue}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-textSecondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.lastUpdated}
                  </p>
                  <p className="font-medium text-textPrimary">
                    {treeCard.lastUpdatedAt
                      ? new Date(treeCard.lastUpdatedAt).toLocaleDateString('es-CO')
                      : texts.common.noValue}
                  </p>
                </div>
              </div>

              {/* Cycle */}
              {treeCard.cycle !== null && (
                <div>
                  <p className="text-xs text-textSecondary uppercase tracking-wide">
                    {texts.publicMap.treeCard.cycle}
                  </p>
                  <p className="font-medium text-textPrimary">
                    {treeCard.cycle > 0 ? treeCard.cycle : texts.publicMap.treeCard.noCycle}
                  </p>
                </div>
              )}

              {/* Photo placeholder */}
              {treeCard.photoPath ? (
                <div className="bg-borderSubtle rounded aspect-video flex items-center justify-center">
                  <p className="text-sm text-textSecondary">
                    {texts.publicMap.treeCard.noPhoto}
                  </p>
                </div>
              ) : (
                <div className="bg-borderSubtle rounded p-3">
                  <p className="text-xs text-textSecondary">{texts.publicMap.treeCard.noPhoto}</p>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && !treeCard && (
            <div className="text-center py-8">
              <p className="text-textSecondary">{texts.states.notAvailableYet}</p>
            </div>
          )}
        </div>

        {/* Footer with close button on mobile */}
        <div className="border-t border-borderSubtle p-4 flex-shrink-0 md:hidden">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-surfaceRaised text-textPrimary rounded font-medium hover:bg-borderSubtle transition-colors"
          >
            {texts.publicMap.treeCard.close}
          </button>
        </div>
      </div>
    </>
  );
}

'use client';

import Image from 'next/image';
import { TreeCard } from '@/features/public-map';
import { texts } from '@/constants/texts';
import styles from './tree-detail-modal.module.css';

/** Names the dialog for a screen reader; the visible heading is the tree code. */
const TITLE_ID = 'embed-tree-detail-title';

interface TreeDetailModalProps {
  tree: TreeCard | null | undefined;
  isLoading: boolean;
  onClose: () => void;
}

/**
 * Modal displaying tree details within the embedded map.
 * Stays within the iframe bounds and does not redirect elsewhere.
 */
export function TreeDetailModal({ tree, isLoading, onClose }: TreeDetailModalProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
      >
        <div className={styles.header}>
          <h2 id={TITLE_ID} className={styles.title}>
            {isLoading ? texts.common.loading : (tree?.code ?? texts.common.noValue)}
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={texts.common.close}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {isLoading && (
          <div className={styles.loadingState} role="status">
            <p>{texts.common.loading}</p>
          </div>
        )}

        {!isLoading && !tree && (
          <div className={styles.errorState} role="alert">
            <p>{texts.publicMap.treeCard.loadFailed}</p>
          </div>
        )}

        {!isLoading && tree && (
          <div className={styles.content}>
            <div className={styles.section}>
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.species}</span>
                <span className={styles.value}>{tree.species}</span>
              </div>
              {tree.speciesOriginal && tree.speciesOriginal !== tree.species && (
                <div className={styles.infoRow}>
                  <span className={styles.label}>{texts.publicMap.treeCard.speciesOriginal}</span>
                  <span className={styles.value}>{tree.speciesOriginal}</span>
                </div>
              )}
            </div>

            <div className={styles.section}>
              {/* `trackingStatus` and not `status`: the latter is the life cycle
                  column (alive, at_risk, dead, replanted) and printing it here
                  showed the reader an English value with no name in the legend. */}
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.status}</span>
                <span className={styles.value}>
                  {texts.publicMap.states[tree.trackingStatus] ?? texts.common.noValue}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.planted}</span>
                <span className={styles.value}>{formatDate(tree.plantedAt)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.lastUpdated}</span>
                <span className={styles.value}>{formatDate(tree.lastUpdatedAt)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.cycle}</span>
                <span className={styles.value}>
                  {tree.cycle && tree.cycle > 0 ? tree.cycle : texts.publicMap.treeCard.noCycle}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.village}</span>
                <span className={styles.value}>{tree.location.vereda ?? texts.common.noValue}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.municipality}</span>
                <span className={styles.value}>
                  {tree.location.municipality ?? texts.common.noValue}
                </span>
              </div>
              <div className={styles.coordinates}>
                <span className={styles.label}>{texts.publicMap.treeCard.coordinates}</span>
                <span className={styles.coordinateValue}>
                  {tree.location.lat.toFixed(6)}, {tree.location.lng.toFixed(6)}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.infoRow}>
                <span className={styles.label}>{texts.publicMap.treeCard.guardian}</span>
                <span className={styles.value}>
                  {tree.guardianName ?? texts.publicMap.treeCard.noGuardian}
                </span>
              </div>
            </div>

            {tree.photoUrl && (
              <div className={styles.photoSection}>
                <Image
                  src={tree.photoUrl}
                  alt={texts.publicMap.treeCard.photoAlt(tree.code)}
                  width={400}
                  height={300}
                  className={styles.photo}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

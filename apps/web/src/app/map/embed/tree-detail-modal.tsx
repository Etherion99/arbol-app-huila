'use client';

import Image from 'next/image';
import { TreeCard } from '@/features/public-map';
import { texts } from '@/constants/texts';
import styles from './tree-detail-modal.module.css';

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
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      updated: texts.treeState.up_to_date,
      due_soon: texts.treeState.due_soon,
      overdue: texts.treeState.overdue,
      dead: texts.treeState.dead,
      archived: texts.treeState.archived,
    };
    return statusMap[status] || status;
  };

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isLoading ? texts.common.loading : tree?.code || '—'}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={texts.common.close}>
            ✕
          </button>
        </div>

        {isLoading && (
          <div className={styles.loadingState}>
            <p>{texts.common.loading}</p>
          </div>
        )}

        {!isLoading && !tree && (
          <div className={styles.errorState}>
            <p>No se pudo cargar la información del árbol.</p>
          </div>
        )}

        {!isLoading && tree && (
          <div className={styles.content}>
            <div className={styles.section}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Especie</span>
                <span className={styles.value}>{tree.species}</span>
              </div>
              {tree.speciesOriginal && tree.speciesOriginal !== tree.species && (
                <div className={styles.infoRow}>
                  <span className={styles.label}>Texto original</span>
                  <span className={styles.value}>{tree.speciesOriginal}</span>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Estado</span>
                <span className={styles.value}>{getStatusLabel(tree.status)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Siembra</span>
                <span className={styles.value}>{formatDate(tree.plantedAt)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Última actualización</span>
                <span className={styles.value}>{formatDate(tree.lastUpdatedAt)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Ciclo</span>
                <span className={styles.value}>{tree.cycle}</span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Ubicación</span>
                <span className={styles.value}>{tree.location.vereda}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Municipio</span>
                <span className={styles.value}>{tree.location.municipality}</span>
              </div>
              <div className={styles.coordinates}>
                <span className={styles.label}>Coordenadas</span>
                <span className={styles.coordinateValue}>
                  {tree.location.lat.toFixed(6)}, {tree.location.lng.toFixed(6)}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Guardián</span>
                <span className={styles.value}>{tree.guardianName}</span>
              </div>
            </div>

            {tree.photoUrl && (
              <div className={styles.photoSection}>
                <Image
                  src={tree.photoUrl}
                  alt={`Fotografía del árbol ${tree.code}`}
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

import { PendingScreen } from '@/components/panel/pending-screen';

export default async function Page({ params }: PageProps<'/panel/moderation/[treeId]'>) {
  const { treeId } = await params;

  return <PendingScreen title={treeId} note="D6" />;
}

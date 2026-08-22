import { PendingScreen } from '@/components/panel/pending-screen';
import { texts } from '@/constants/texts';

export default function Page() {
  return <PendingScreen title={texts.export.title} note="D7" />;
}

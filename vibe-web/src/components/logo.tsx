import type { FC } from 'react';
import { Terminal } from 'lucide-react';

const Logo: FC = () => {
  return (
    <div className="flex items-center gap-2 text-xl font-bold text-primary">
      <Terminal className="h-6 w-6" />
      <span className="font-headline">Vibe CLI</span>
    </div>
  );
};

export default Logo;

'use client';

import { ReactNode } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CrudDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
}

export function CrudDialog({ open, onClose, title, children, onSave, saving, saveLabel }: CrudDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>İptal</Button>
          <Button onClick={onSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {saving && <Loader2 size={16} className="mr-1 animate-spin" />}
            {saveLabel ?? 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

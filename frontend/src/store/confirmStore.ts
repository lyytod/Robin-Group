import React from 'react';
import { create } from 'zustand';

export interface ConfirmItemDetail {
  label: string;
  value: string;
}

export interface ConfirmOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  itemDetails?: ConfirmItemDetail[];
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info';
  itemDetails?: ConfirmItemDetail[];
  resolveCallback: ((value: boolean) => void) | null;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  closeConfirm: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Ya, Lanjutkan',
  cancelText: 'Batal',
  type: 'danger',
  itemDetails: undefined,
  resolveCallback: null,

  openConfirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || (options.type === 'danger' ? 'Ya, Hapus Data' : 'Ya, Lanjutkan'),
        cancelText: options.cancelText || 'Batal',
        type: options.type || 'danger',
        itemDetails: options.itemDetails,
        resolveCallback: resolve,
      });
    });
  },

  closeConfirm: (result: boolean) => {
    const callback = get().resolveCallback;
    if (callback) {
      callback(result);
    }
    set({
      isOpen: false,
      resolveCallback: null,
      itemDetails: undefined,
    });
  },
}));

/**
 * Helper global untuk memanggil custom modal konfirmasi di halaman mana pun
 * @example
 * const confirmed = await confirmDialog({
 *   title: 'Hapus Karyawan?',
 *   message: 'Yakin ingin menghapus karyawan ini?',
 *   type: 'danger',
 * });
 * if (confirmed) { ... }
 */
export const confirmDialog = (options: ConfirmOptions): Promise<boolean> => {
  return useConfirmStore.getState().openConfirm(options);
};


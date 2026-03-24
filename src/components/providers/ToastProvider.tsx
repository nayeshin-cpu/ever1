'use client';

import { Toaster } from 'sonner';

/**
 * 전역 토스트 알림 Provider
 * ref: TASK-801 (전역 에러 처리 및 토스트 시스템)
 */
export function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            richColors
            expand={false}
            closeButton
            toastOptions={{
                style: {
                    fontFamily: 'inherit',
                },
                duration: 4000,
            }}
        />
    );
}

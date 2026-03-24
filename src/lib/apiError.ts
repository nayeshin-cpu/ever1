/**
 * API 에러 코드와 사용자 표시 메시지 매핑
 * ref: TRD v2.1 §7.2 (에러별 처리 정책)
 *      PRD v2.1 §4.4 (에러 처리)
 */

export type ApiErrorCode =
    | 'FILE_FORMAT_ERROR'    // JPG/PNG 외 파일
    | 'FILE_SIZE_EXCEED'     // 10MB 초과
    | 'PET_NOT_DETECTED'     // 반려동물 미감지
    | 'AI_FAIL_RETRY'        // AI 생성 실패 1회 (자동 재시도)
    | 'AI_FAIL_FINAL'        // AI 생성 실패 2회 (크레딧 반환)
    | 'CREDIT_EXCEED'        // 월 한도 초과
    | 'UNAUTHORIZED'         // 미인증
    | 'FORBIDDEN'            // 접근 권한 없음
    | 'SERVER_ERROR'         // 서버 내부 오류
    | 'NETWORK_ERROR'        // 네트워크 오류
    | 'UNKNOWN_ERROR';       // 알 수 없는 오류

export interface ApiErrorInfo {
    code: ApiErrorCode;
    message: string;
    description?: string;
}

/**
 * 에러 코드 → 사용자 표시 메시지 매핑
 */
const API_ERROR_MESSAGES: Record<ApiErrorCode, { message: string; description?: string }> = {
    FILE_FORMAT_ERROR: {
        message: 'JPG 또는 PNG 파일만 올릴 수 있어요',
        description: '다른 형식의 파일은 지원하지 않아요.',
    },
    FILE_SIZE_EXCEED: {
        message: '10MB 이하 사진을 올려주세요',
        description: '사진 용량이 너무 크면 업로드가 어려워요.',
    },
    PET_NOT_DETECTED: {
        message: '사진에서 아이를 찾지 못했어요',
        description: '아이가 잘 보이는 사진으로 다시 시도해주세요.',
    },
    AI_FAIL_RETRY: {
        message: '잠깐 문제가 생겼어요. 한 번 더 시도해볼게요',
        description: '자동으로 다시 시도하고 있어요.',
    },
    AI_FAIL_FINAL: {
        message: '오늘은 만들기가 어렵네요. 크레딧은 돌려드릴게요',
        description: '잠시 후 다시 시도해주세요.',
    },
    CREDIT_EXCEED: {
        message: '이번 달 생성 횟수를 모두 사용했어요',
        description: '플랜을 업그레이드하면 더 많이 만들 수 있어요.',
    },
    UNAUTHORIZED: {
        message: '로그인이 필요해요',
        description: '로그인 후 이용해주세요.',
    },
    FORBIDDEN: {
        message: '접근 권한이 없어요',
        description: '본인의 콘텐츠만 접근할 수 있어요.',
    },
    SERVER_ERROR: {
        message: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요',
        description: '문제가 지속되면 고객센터에 문의해주세요.',
    },
    NETWORK_ERROR: {
        message: '인터넷 연결을 확인해주세요',
        description: '네트워크 연결 후 다시 시도해주세요.',
    },
    UNKNOWN_ERROR: {
        message: '알 수 없는 오류가 발생했어요',
        description: '잠시 후 다시 시도해주세요.',
    },
};

/**
 * 에러 코드로 사용자 표시 메시지를 가져옵니다.
 */
export function getApiErrorMessage(code: ApiErrorCode): ApiErrorInfo {
    const info = API_ERROR_MESSAGES[code];
    return {
        code,
        message: info.message,
        description: info.description,
    };
}

/**
 * HTTP 상태 코드로 ApiErrorCode를 추론합니다.
 */
export function getErrorCodeFromStatus(status: number): ApiErrorCode {
    switch (status) {
        case 400:
            return 'SERVER_ERROR';
        case 401:
            return 'UNAUTHORIZED';
        case 403:
            return 'FORBIDDEN';
        case 413:
            return 'FILE_SIZE_EXCEED';
        case 415:
            return 'FILE_FORMAT_ERROR';
        case 429:
            return 'CREDIT_EXCEED';
        case 500:
        case 502:
        case 503:
        case 504:
            return 'SERVER_ERROR';
        default:
            return 'UNKNOWN_ERROR';
    }
}

/**
 * API Response에서 에러 메시지를 추출합니다.
 * 서버가 반환하는 error 문자열을 ApiErrorCode로 매핑합니다.
 */
export function parseApiError(errorMessage: string, httpStatus?: number): ApiErrorInfo {
    // 서버 에러 문자열 → 에러 코드 매핑
    const errorKeywords: Array<{ keyword: string; code: ApiErrorCode }> = [
        { keyword: 'JPG 또는 PNG', code: 'FILE_FORMAT_ERROR' },
        { keyword: '10MB', code: 'FILE_SIZE_EXCEED' },
        { keyword: '아이를 찾지', code: 'PET_NOT_DETECTED' },
        { keyword: '생성 횟수를 모두', code: 'CREDIT_EXCEED' },
        { keyword: '크레딧은 돌려', code: 'AI_FAIL_FINAL' },
        { keyword: '로그인', code: 'UNAUTHORIZED' },
        { keyword: '권한', code: 'FORBIDDEN' },
    ];

    for (const { keyword, code } of errorKeywords) {
        if (errorMessage.includes(keyword)) {
            return getApiErrorMessage(code);
        }
    }

    if (httpStatus) {
        return getApiErrorMessage(getErrorCodeFromStatus(httpStatus));
    }

    return getApiErrorMessage('UNKNOWN_ERROR');
}

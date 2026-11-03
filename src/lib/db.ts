import * as local from './db.local';
import * as supabase from './db.supabase';
import type { Store } from './store';

// 저장소 선택: Supabase 환경변수가 있으면 Supabase, 없으면 로컬 JSON 파일(.data/).
// 라우트·페이지는 이 파일만 import 한다.
export const USING_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const impl: Store = USING_SUPABASE ? supabase.store : local.store;

export const { getSite, getSiteBySlug, putSite, connectBlock, listNotices, addNotice, deleteNotice, listPhotos, addPhoto, deletePhoto, loadBlockData } =
  impl;
export const UPLOAD_DIR = local.UPLOAD_DIR;
export type { Fail, PhotoInput, Store } from './store';

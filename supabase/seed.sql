-- 11절 시드 (config v2, GRID_SPEC 4절). src/lib/seed.ts의 SEED_SITE와 같은 내용을 유지할 것.
-- ⚠ v2다. master(v1 코드)가 읽는 DB에서 실행하면 그 배포본의 공개 페이지가 깨진다. grid-layout 코드를 배포하는 DB에서만 실행한다.
-- 기존 v1 행은 SQL로 바꾸지 않는다: 읽을 때 v2로 변환되고 첫 저장 때 v2로 덮인다.
insert into sites (id, slug, config) values (
  'site_kimlab',
  'kim-lab',
  $json$
  {
    "version": 2,
    "siteId": "site_kimlab",
    "slug": "kim-lab",
    "title": "김OO 연구실",
    "theme": { "accent": "#1E3A8A", "font": "pretendard", "scale": "md", "background": "plain" },
    "layout": {
      "a1b2c3d4": { "x": 0, "y": 0, "w": 48, "h": 3 },
      "e5f6g7h8": { "x": 2, "y": 4, "w": 14, "h": 24 },
      "i9j0k1l2": { "x": 2, "y": 29, "w": 14, "h": 9 },
      "u1v2w3x4": { "x": 18, "y": 4, "w": 28, "h": 12 },
      "m3n4o5p6": { "x": 18, "y": 17, "w": 28, "h": 13 },
      "q7r8s9t0": { "x": 18, "y": 31, "w": 28, "h": 11 },
      "y5z6a7b8": { "x": 2, "y": 43, "w": 44, "h": 6 }
    },
    "blocks": {
      "a1b2c3d4": { "type": "nav", "props": { "items": ["소개", "연구", "논문", "연락처"] } },
      "e5f6g7h8": { "type": "profile", "props": { "name": "김OO", "title": "교수", "dept": "OO대학교 OO학과 OO 연구실", "email": "kim@example.ac.kr", "photoUrl": "" } },
      "i9j0k1l2": { "type": "text", "props": { "heading": "연구 소개", "body": "우리 연구실은 OO 현상을 이해하고 이를 응용하는 연구를 합니다.\n실험과 계산을 함께 써서 새로운 소재와 공정을 설계합니다.\n학부 연구생과 대학원생을 항상 환영합니다." } },
      "u1v2w3x4": { "type": "publications", "props": { "items": [
        { "title": "논문 제목 예시 1", "venue": "저널명 예시 A", "year": 2026, "url": "" },
        { "title": "논문 제목 예시 2", "venue": "저널명 예시 B", "year": 2025, "url": "" },
        { "title": "논문 제목 예시 3", "venue": "저널명 예시 C", "year": 2024, "url": "" }
      ] } },
      "m3n4o5p6": { "type": "notices", "props": { "heading": "공지사항", "limit": 5 }, "feature": { "key": "notice-post", "connected": false } },
      "q7r8s9t0": { "type": "photos", "props": { "heading": "사진", "columns": 3 }, "feature": { "key": "photo-upload", "connected": false } },
      "y5z6a7b8": { "type": "text", "props": { "heading": "연락처", "body": "OO대학교 OO관 000호\nkim@example.ac.kr" } }
    }
  }
  $json$::jsonb
)
on conflict (id) do update set slug = excluded.slug, config = excluded.config, updated_at = now();

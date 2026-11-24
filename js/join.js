'use strict';
// 회원 가입 안내 화면. 신청 설문지 주소(SITE.joinFormUrl)가 있으면 신청 단추를 보인다.
(function () {
  if (!SITE.joinFormUrl) return;
  document.getElementById('join-form-link').href = SITE.joinFormUrl;
  document.getElementById('join-form').hidden = false;
  document.getElementById('join-form-pending').hidden = true;
})();

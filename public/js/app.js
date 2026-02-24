document.addEventListener("DOMContentLoaded", () => {
  const pesticideKeywordInput = document.getElementById("pesticideKeyword");
  const targetKeywordInput = document.getElementById("targetKeyword");
  const searchBtn = document.getElementById("searchBtn");
  const resultsDiv = document.getElementById("results");

  let latestSearchItems = [];

  searchBtn.addEventListener("click", doSearch);
  pesticideKeywordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
  targetKeywordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });

  function getRacClassByCode(racCode) {
    const code = String(racCode || "").toUpperCase();
    if (code.startsWith("FRAC-")) return "rac-frac";
    if (code.startsWith("IRAC-")) return "rac-irac";
    if (code.startsWith("HRAC-")) return "rac-hrac";
    return "rac-frac";
  }

  function getRacOrderValue(code) {
    const c = String(code || "").toUpperCase();
    if (c.startsWith("FRAC-")) return 1;
    if (c.startsWith("IRAC-")) return 2;
    if (c.startsWith("HRAC-")) return 3;
    return 9;
  }

  function sortRacCodes(racCodes) {
    return [...(racCodes || [])].sort((a, b) => {
      const oa = getRacOrderValue(a);
      const ob = getRacOrderValue(b);
      if (oa !== ob) return oa - ob;
      return String(a).localeCompare(String(b));
    });
  }

  function sortRacList(racList) {
    return [...(racList || [])].sort((a, b) => {
      const ca = `${a.rac_type}-${a.rac_code}`;
      const cb = `${b.rac_type}-${b.rac_code}`;
      const oa = getRacOrderValue(ca);
      const ob = getRacOrderValue(cb);
      if (oa !== ob) return oa - ob;
      return ca.localeCompare(cb);
    });
  }

  function renderRacBadges(racCodes, matchedCodes = []) {
    if (!racCodes || racCodes.length === 0) return "－";
    const matched = new Set(matchedCodes || []);
    return racCodes
      .map(code => {
        const matchClass = matched.has(code) ? " rac-match" : "";
        return `<span class="rac-badge ${getRacClassByCode(code)}${matchClass}"><strong>${code}</strong></span>`;
      })
      .join("");
  }

  async function doSearch() {
    const pesticideKeyword = pesticideKeywordInput.value.trim();
    const targetKeyword = targetKeywordInput.value.trim();
    const hasOneCharKeyword =
      (pesticideKeyword.length > 0 && pesticideKeyword.length < 2) ||
      (targetKeyword.length > 0 && targetKeyword.length < 2);

    if (hasOneCharKeyword) {
      resultsDiv.innerHTML = '<div class="alert alert-warning">2文字以上で検索してください</div>';
      return;
    }

    try {
      const res = await fetch(
        `/api/search?pesticideKeyword=${encodeURIComponent(pesticideKeyword)}&targetKeyword=${encodeURIComponent(targetKeyword)}`
      );
      const data = await res.json();
      latestSearchItems = data;
      renderResults(data);
    } catch (err) {
      resultsDiv.innerHTML = `<div class="alert alert-danger">検索エラー: ${err.message}</div>`;
    }
  }

  function renderResults(items) {
    if (items.length === 0) {
      resultsDiv.innerHTML = '<div class="alert alert-info">該当する農薬が見つかりませんでした。</div>';
      return;
    }

    let html = `<p class="text-muted">${items.length} 件の農薬が見つかりました</p>`;
    html += '<table class="table table-hover table-bordered bg-white">';
    html += '<thead class="table-light"><tr><th>登録番号</th><th>用途</th><th>農薬名称</th><th>メーカー名</th><th>RACコード</th><th>選択</th></tr></thead><tbody>';
    items.forEach(item => {
      const sortedCodes = sortRacCodes(item.racCodes || []);
      html += `<tr>
        <td>${item.登録番号}</td>
        <td>${item.用途_x}</td>
        <td>${item.農薬の名称_x}</td>
        <td>${item.正式名称}</td>
        <td>${renderRacBadges(sortedCodes)}</td>
        <td><button class="btn btn-sm btn-primary" onclick="loadDetail('${item.登録番号}')">選択</button></td>
      </tr>`;
    });
    html += "</tbody></table>";
    resultsDiv.innerHTML = html;
  }

  function renderDetailTable(detailRows) {
    let html = '<div class="table-responsive"><table class="table table-sm table-bordered"><thead class="table-light"><tr>';
    html += "<th>作物名</th><th>適用場所</th><th>適用病害虫雑草名</th><th>有効成分</th><th>濃度</th><th>希釈倍数</th><th>使用時期</th><th>使用方法</th><th>総使用回数</th>";
    html += "</tr></thead><tbody>";
    detailRows.forEach(row => {
      html += `<tr>
        <td>${row.作物名}</td><td>${row.適用場所}</td><td>${row.適用病害虫雑草名}</td>
        <td>${row.有効成分}</td><td>${row.濃度}</td><td>${row.希釈倍数使用量}</td>
        <td>${row.使用時期}</td><td>${row.使用方法}</td><td>${row.総使用回数}</td>
      </tr>`;
    });
    html += "</tbody></table></div>";
    return html;
  }

  function renderRacTables(racList) {
    if (!racList || racList.length === 0) return '<p class="text-muted mb-2">RAC情報なし</p>';
    let html = "";
    sortRacList(racList).forEach(rac => {
      const code = `${rac.rac_type}-${rac.rac_code}`;
      html += '<div class="table-responsive mb-2"><table class="table table-sm table-bordered">';
      html += "<tbody>";
      html += `<tr><th style="width:180px;">RACコード</th><td>${renderRacBadges([code])}</td></tr>`;
      html += `<tr><th>グループ名</th><td>${rac.group_name || "－"}</td></tr>`;
      html += `<tr><th>作用機作</th><td>${rac.made_of_action || "－"}</td></tr>`;
      html += `<tr><th>代表成分</th><td>${rac.examples || "－"}</td></tr>`;
      html += `<tr><th>備考</th><td>${rac.remarks || "－"}</td></tr>`;
      html += "</tbody></table></div>";
    });
    return html;
  }

  window.loadDetail = async function(regNo) {
    try {
      const res = await fetch(`/api/detail?regNo=${encodeURIComponent(regNo)}`);
      const data = await res.json();
      if (!data.detail || data.detail.length === 0) {
        resultsDiv.innerHTML = '<div class="alert alert-warning">詳細情報が見つかりませんでした。</div>';
        return;
      }

      const first = data.detail[0];
      const allRacCodes = sortRacCodes((data.racList || []).map(r => `${r.rac_type}-${r.rac_code}`));

      let html = '<div class="card mt-3"><div class="card-body">';
      html += '<button class="btn btn-sm btn-secondary mb-3" onclick="backToResults()">一覧へ戻る</button>';
      html += `<h5 class="card-title">${first.農薬の名称_x}</h5>`;
      html += `<p class="text-muted mb-2">登録番号: ${first.登録番号} ／ 用途: ${first.用途_x} ／ メーカー: ${first.正式名称}</p>`;
      html += '<div class="mb-2"><strong>RACコード</strong></div>';
      if (allRacCodes.length > 0) {
        html += `<div class="mb-3">${renderRacBadges(allRacCodes)}</div>`;
      } else {
        html += '<div class="mb-3 text-muted">RAC情報なし</div>';
      }
      html += `<div class="mb-3"><button class="btn btn-sm btn-analysis" onclick="showRacAndRotation('${first.登録番号}')">同一グループを含む農薬</button></div>`;
      html += "<h6>適用情報</h6>";
      html += renderDetailTable(data.detail);
      html += '<hr><h6 class="mb-2">RAC情報</h6>';
      html += renderRacTables(data.racList || []);
      html += '<div id="racAndRotationArea"></div>';
      html += "</div></div>";

      resultsDiv.innerHTML = html;
    } catch (err) {
      resultsDiv.innerHTML = `<div class="alert alert-danger">詳細取得エラー: ${err.message}</div>`;
    }
  };

  window.backToResults = function() {
    renderResults(latestSearchItems);
  };

  window.showRacAndRotation = async function(regNo) {
    const area = document.getElementById("racAndRotationArea");
    if (!area) return;

    try {
      const detailRes = await fetch(`/api/detail?regNo=${encodeURIComponent(regNo)}`);
      const detailData = await detailRes.json();
      const sourceRacCodes = sortRacCodes((detailData.racList || []).map(r => `${r.rac_type}-${r.rac_code}`));

      const sameRes = await fetch(`/api/samegroup?regNo=${encodeURIComponent(regNo)}`);
      const sameGroupData = await sameRes.json();

      const rotationRes = await fetch(`/api/rotation?regNo=${encodeURIComponent(regNo)}`);
      const rotationData = await rotationRes.json();

      let html = "";
      html += '<div class="rotation-grid mt-3">';
      html += '<div class="card"><div class="card-body">';
      html += '<h6>同一グループを含む農薬</h6><ul class="list-group list-group-flush rotation-list">';
      if (!sameGroupData || sameGroupData.length === 0) {
        html += '<li class="list-group-item">該当なし</li>';
      } else {
        sameGroupData.forEach(p => {
          const codes = sortRacCodes(p.racCodes || []);
          const matched = sortRacCodes((p.matchedRacCodes || []).filter(code => sourceRacCodes.includes(code)));
          html += `<li class="list-group-item detail-expand" onclick="loadDetail('${p.登録番号}')">${p.登録番号} ${p.農薬の名称_x} (${p.正式名称})<div class="mt-1">${renderRacBadges(codes, matched)}</div></li>`;
        });
      }
      html += "</ul></div></div>";

      html += '<div class="card"><div class="card-body">';
      html += '<h6>次回のおすすめローテーション</h6><ul class="list-group list-group-flush rotation-list">';
      if (!rotationData || rotationData.length === 0) {
        html += '<li class="list-group-item">該当なし</li>';
      } else {
        rotationData.forEach(p => {
          const badges = renderRacBadges(sortRacCodes(p.racCodes || []));
          html += `<li class="list-group-item detail-expand" onclick="loadDetail('${p.登録番号}')">${p.登録番号} ${p.農薬の名称_x} (${p.正式名称})<div class="mt-1">${badges}</div></li>`;
        });
      }
      html += "</ul></div></div>";
      html += "</div>";

      area.innerHTML = html;
    } catch (err) {
      area.innerHTML = `<div class="alert alert-danger mt-2">RAC/ローテーション取得エラー: ${err.message}</div>`;
    }
  };
});

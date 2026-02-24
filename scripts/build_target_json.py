import argparse
import json
import unicodedata
from pathlib import Path

import pandas as pd


KEYWORDS = ["芝", "樹木", "庭木", "街路樹", "花き", "草花", "観賞用"]


def normalize_for_match(val):
    return unicodedata.normalize("NFKC", str(val or "")).replace(" ", "").replace("\u3000", "").lower()


def normalize_text_cell(val):
    if isinstance(val, str):
        return unicodedata.normalize("NFKC", val)
    return val


def row_match(row):
    crop = normalize_for_match(row.get("作物名", ""))
    use_x = normalize_for_match(row.get("用途_x", ""))
    use_y = normalize_for_match(row.get("用途_y", ""))
    return any(k in crop or k in use_x or k in use_y for k in KEYWORDS)


def compact_row(row):
    out = {}

    def put(key, value):
        if value is None:
            return
        if isinstance(value, str) and value == "":
            return
        out[key] = value

    put("登録番号", row.get("登録番号"))
    put("用途_x", row.get("用途_x") or row.get("用途_y"))
    put("農薬の種類_x", row.get("農薬の種類_x") or row.get("農薬の種類_y"))
    put("農薬の名称_x", row.get("農薬の名称_x") or row.get("農薬の名称_y"))
    put("正式名称", row.get("正式名称"))
    put("作物名", row.get("作物名"))
    put("適用場所", row.get("適用場所"))
    put("適用病害虫雑草名", row.get("適用病害虫雑草名"))
    put("有効成分", row.get("有効成分"))
    put("濃度", row.get("濃度"))
    put("希釈倍数使用量", row.get("希釈倍数使用量"))
    put("散布液量", row.get("散布液量"))
    put("使用時期", row.get("使用時期"))
    put("使用方法", row.get("使用方法"))

    for k, v in row.items():
        if not isinstance(k, str):
            continue
        if k.startswith("有効成分") and k != "有効成分":
            put(k, v)
        if "総使用回数" in k:
            put(k, v)

    return out


def collect_components(rows):
    comps = set()
    for row in rows:
        for k, v in row.items():
            if not isinstance(k, str):
                continue
            if not k.startswith("有効成分"):
                continue
            if v is None:
                continue
            s = str(v).strip()
            if not s:
                continue
            comps.add(normalize_for_match(s))
    return comps


def filter_rac_by_components(rac_data, components):
    out = {}
    for group in ["frac", "irac", "hrac"]:
        src = rac_data.get(group, [])
        kept = []
        for item in src:
            ex = normalize_for_match(item.get("examples", ""))
            if not ex:
                continue
            if any((c in ex) or (ex in c) for c in components):
                kept.append(item)
        out[group] = kept
    return out


def write_json_utf8(path, payload):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    with open(path, "r", encoding="utf-8") as f:
        f.read()


def estimate_memory_mb(file_path):
    size_mb = file_path.stat().st_size / (1024 * 1024)
    # Rough estimate for parsed Python/Node object footprint.
    return size_mb * 3.5


def main():
    parser = argparse.ArgumentParser(description="Build target pesticide JSONs for turf/tree/flowers")
    parser.add_argument("--basic", required=False, help="Path to 登録基本部.xlsx")
    parser.add_argument("--app1", required=False, help="Path to 登録適用部一.xlsx")
    parser.add_argument("--app2", required=False, help="Path to 登録適用部二.xlsx")
    parser.add_argument("--rac-json", default=str(Path("data") / "pesticide_data.json"))
    parser.add_argument("--out-pesticides", default=str(Path("data") / "pesticides_target.json"))
    parser.add_argument("--out-rac", default=str(Path("data") / "pesticide_rac_target.json"))
    args = parser.parse_args()

    basic_path = args.basic
    app1_path = args.app1
    app2_path = args.app2
    if not (basic_path and app1_path and app2_path):
        xlsx_files = sorted(Path.cwd().glob("*.xlsx"), key=lambda p: p.stat().st_size)
        if len(xlsx_files) < 3:
            raise FileNotFoundError("Excel files not found. Specify --basic --app1 --app2 explicitly.")
        basic_path = str(xlsx_files[0])
        app1_path = str(xlsx_files[1])
        app2_path = str(xlsx_files[2])
        print(f"[target-build] auto-detected basic={basic_path}")
        print(f"[target-build] auto-detected app1={app1_path}")
        print(f"[target-build] auto-detected app2={app2_path}")

    basic_df = pd.read_excel(basic_path, engine="openpyxl", dtype=str)
    app1_df = pd.read_excel(app1_path, engine="openpyxl", dtype=str)
    app2_df = pd.read_excel(app2_path, engine="openpyxl", dtype=str)

    basic_df = basic_df.apply(lambda col: col.map(normalize_text_cell))
    app1_df = app1_df.apply(lambda col: col.map(normalize_text_cell))
    app2_df = app2_df.apply(lambda col: col.map(normalize_text_cell))

    app_df = pd.concat([app1_df, app2_df], ignore_index=True)
    merged_df = pd.merge(app_df, basic_df, on="登録番号", how="left")
    all_rows = merged_df.where(pd.notnull(merged_df), None).to_dict(orient="records")

    filtered_rows_raw = [r for r in all_rows if row_match(r)]
    filtered_rows = [compact_row(r) for r in filtered_rows_raw]

    total = len(all_rows)
    extracted = len(filtered_rows)
    excluded = total - extracted
    ratio = (extracted / total * 100.0) if total else 0.0

    rac_data = json.loads(Path(args.rac_json).read_text(encoding="utf-8"))
    components = collect_components(filtered_rows)
    rac_target = filter_rac_by_components(rac_data, components)

    out_pesticides_path = Path(args.out_pesticides)
    out_rac_path = Path(args.out_rac)
    out_pesticides_path.parent.mkdir(parents=True, exist_ok=True)

    write_json_utf8(out_pesticides_path, filtered_rows)
    write_json_utf8(out_rac_path, rac_target)

    pesticides_size_mb = out_pesticides_path.stat().st_size / (1024 * 1024)
    rac_size_mb = out_rac_path.stat().st_size / (1024 * 1024)

    print(f"[target-build] total={total}")
    print(f"[target-build] extracted={extracted}")
    print(f"[target-build] excluded={excluded}")
    print(f"[target-build] extract_rate={ratio:.2f}%")
    print(f"[target-build] components_for_rac={len(components)}")
    print(f"[target-build] rac_frac={len(rac_target.get('frac', []))}")
    print(f"[target-build] rac_irac={len(rac_target.get('irac', []))}")
    print(f"[target-build] rac_hrac={len(rac_target.get('hrac', []))}")
    print(f"[target-build] out={out_pesticides_path} size={pesticides_size_mb:.2f}MB")
    print(f"[target-build] out={out_rac_path} size={rac_size_mb:.2f}MB")
    print(
        "[target-build] estimated_runtime_memory="
        f"{estimate_memory_mb(out_pesticides_path) + estimate_memory_mb(out_rac_path):.2f}MB"
    )
    print("[target-build] utf8_verification=OK")


if __name__ == "__main__":
    main()

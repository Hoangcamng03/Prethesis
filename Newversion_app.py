"""
ProSocket Studio – App A v9.6 (Manual Control Edition)
Cập nhật:
  - Gỡ bỏ AI Phân loại, tăng tốc độ load file tức thì.
  - Đổi giao diện từ kéo thả (Slider) sang nhập số (Entry) chuyên nghiệp.
  - Tối ưu hóa tên gọi các thông số kỹ thuật cho dễ hiểu hơn.
  - Thêm cảnh báo quá tải Mesh.
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import trimesh
import numpy as np
from scipy.spatial import ConvexHull
from shapely.geometry import Point, Polygon
import json
import os

# ────────────────────────────────────────────────────────────
# HẰNG SỐ MẶC ĐỊNH
# ────────────────────────────────────────────────────────────
DEFAULT_OUTPUT_ROOT  = r"D:\STEP\Processed_mesh"
SMOOTH_ITERATIONS    = 3
SMOOTH_LAMB          = 0.3
SLICE_STEP_RATIO     = 0.20
ADAPTIVE_LOW_RATIO   = 0.20
ADAPTIVE_HIGH_RATIO  = 0.80

# ════════════════════════════════════════════════════════════
# PIPELINE XỬ LÝ MESH & ALIGNMENT
# ════════════════════════════════════════════════════════════
def remove_small_components(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    comps = mesh.split(only_watertight=False)
    return max(comps, key=lambda c: len(c.faces)) if len(comps) > 1 else mesh

def decimate_mesh(mesh: trimesh.Trimesh, target_faces: int) -> trimesh.Trimesh:
    if len(mesh.faces) <= target_faces: return mesh
    try: return mesh.simplify_quadric_decimation(face_count=target_faces)
    except:
        try:
            import pyfqmr
            simplifier = pyfqmr.Simplify()
            simplifier.setMesh(mesh.vertices.astype(np.float64), mesh.faces.astype(np.int32))
            simplifier.simplify_mesh(target_count=target_faces, aggressiveness=5, preserve_border=True, verbose=False)
            verts, faces, _ = simplifier.getMesh()
            return trimesh.Trimesh(vertices=verts, faces=faces, process=False)
        except: return mesh

def get_cross_section_perimeter(mesh: trimesh.Trimesh, z_height: float) -> float:
    try:
        section = mesh.section(plane_origin=[0, 0, z_height], plane_normal=[0, 0, 1])
        if not section or not section.discrete: return 0.0
        return float(ConvexHull(max(section.discrete, key=len)[:, :2]).area)
    except: return 0.0

def perform_pca_alignment(mesh: trimesh.Trimesh):
    centroid = mesh.vertices.mean(axis=0)
    centered = mesh.vertices - centroid
    cov = np.cov(centered.T)
    _, eigvecs = np.linalg.eigh(cov)
    main_axis = eigvecs[:, -1]
    if main_axis[2] < 0: main_axis = -main_axis

    cross = np.cross(main_axis, [0, 0, 1])
    norm = np.linalg.norm(cross)
    R_mat = trimesh.transformations.rotation_matrix(np.arccos(np.clip(np.dot(main_axis, [0,0,1]), -1, 1)), cross/norm if norm > 1e-6 else [1,0,0])
    
    mesh.vertices -= centroid
    mesh.apply_transform(R_mat)
    mesh.vertices[:, 2] -= mesh.vertices[:, 2].min()

    z_range = mesh.vertices[:, 2].max() - mesh.vertices[:, 2].min()
    if get_cross_section_perimeter(mesh, z_range * 0.2) > get_cross_section_perimeter(mesh, z_range * 0.8):
        mesh.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
        mesh.vertices[:, 2] -= mesh.vertices[:, 2].min()
    return mesh

def full_mesh_pipeline(mesh: trimesh.Trimesh, target_faces: int) -> trimesh.Trimesh:
    mesh = remove_small_components(mesh)
    mesh = decimate_mesh(mesh, target_faces)
    trimesh.smoothing.filter_laplacian(mesh, lamb=SMOOTH_LAMB, iterations=SMOOTH_ITERATIONS)
    mesh.update_faces(mesh.unique_faces())
    mesh.remove_unreferenced_vertices()
    trimesh.repair.fix_normals(mesh, multibody=False)
    trimesh.repair.fill_holes(mesh)
    mesh.merge_vertices(merge_norm=True)
    return mesh

# ════════════════════════════════════════════════════════════
# MODULE LÕI: HYBRID RESAMPLING & SEQUENTIAL ANTI-TWIST
# ════════════════════════════════════════════════════════════
def resample_arc_length(pts_2d: np.ndarray, n: int) -> np.ndarray:
    diffs = np.diff(pts_2d, axis=0)
    seg_lens = np.sqrt((diffs ** 2).sum(axis=1))
    cum_lens = np.concatenate([[0.0], np.cumsum(seg_lens)])
    total_len = cum_lens[-1]
    
    sample_lens = np.linspace(0, total_len, n, endpoint=False)
    resampled = np.zeros((n, 2))
    for i, sl in enumerate(sample_lens):
        idx = np.clip(np.searchsorted(cum_lens, sl, side='right') - 1, 0, len(pts_2d) - 2)
        t = (sl - cum_lens[idx]) / max(seg_lens[idx], 1e-10)
        resampled[i] = pts_2d[idx] + t * diffs[idx]
    return resampled

def resample_radial(pts_2d: np.ndarray, n: int, cx: float, cy: float) -> np.ndarray:
    shifted = pts_2d - [cx, cy]
    thetas = np.arctan2(shifted[:, 1], shifted[:, 0])
    rs = np.linalg.norm(shifted, axis=1)
    
    sort_idx = np.argsort(thetas)
    thetas = thetas[sort_idx] + np.arange(len(thetas)) * 1e-9
    rs = rs[sort_idx]
    
    thetas_ext = np.concatenate([thetas[-1:] - 2*np.pi, thetas, thetas[:1] + 2*np.pi])
    rs_ext = np.concatenate([rs[-1:], rs, rs[:1]])
    
    target_thetas = np.linspace(-np.pi, np.pi, n, endpoint=False)
    target_rs = np.interp(target_thetas, thetas_ext, rs_ext)
    
    out = np.zeros((n, 2))
    out[:, 0] = cx + target_rs * np.cos(target_thetas)
    out[:, 1] = cy + target_rs * np.sin(target_thetas)
    return out

def resample_contour_smart(pts_2d: np.ndarray, n: int) -> np.ndarray:
    if not np.allclose(pts_2d[0], pts_2d[-1]): pts_2d = np.vstack([pts_2d, pts_2d[0]])
    area = 0.5 * np.sum(pts_2d[:, 0] * np.roll(pts_2d[:, 1], -1) - np.roll(pts_2d[:, 0], -1) * pts_2d[:, 1])
    if area < 0: pts_2d = pts_2d[::-1]

    poly = Polygon(pts_2d)
    cx, cy = poly.centroid.x, poly.centroid.y
    hull = ConvexHull(pts_2d)
    
    is_star = poly.contains(Point(cx, cy)) and (poly.area / hull.volume > 0.95)
    return resample_radial(pts_2d, n, cx, cy) if is_star else resample_arc_length(pts_2d, n)

def apply_local_volume_reduction(profiles, vol_factor):
    for prof in profiles:
        pts = np.array(prof["points_cm"])
        cx, cy = np.mean(pts[:, 0]), np.mean(pts[:, 1])
        scaled = [cx, cy] + (pts - [cx, cy]) * vol_factor
        prof["points_cm"] = scaled.tolist()
    return profiles

def sequential_align_profiles(profiles):
    if len(profiles) < 2: return profiles

    pts_0 = np.array(profiles[0]["points_cm"])
    cx, cy = np.mean(pts_0[:, 0]), np.mean(pts_0[:, 1])
    angles = np.arctan2(pts_0[:, 1] - cy, pts_0[:, 0] - cx)
    angle_diff = np.abs(np.arctan2(np.sin(angles - np.pi/2), np.cos(angles - np.pi/2)))
    profiles[0]["points_cm"] = np.roll(pts_0, -np.argmin(angle_diff), axis=0).tolist()

    for i in range(1, len(profiles)):
        anchor_pt = np.array(profiles[i-1]["points_cm"][0])
        curr_pts = np.array(profiles[i]["points_cm"])
        
        dists = np.sum((curr_pts - anchor_pt)**2, axis=1)
        best_idx = np.argmin(dists)
        
        profiles[i]["points_cm"] = np.roll(curr_pts, -best_idx, axis=0).tolist()

    return profiles

def compute_and_export_profiles(mesh, prof_path, vol_factor, params) -> int:
    z_min = float(mesh.vertices[:, 2].min())
    z_max = float(mesh.vertices[:, 2].max())
    z_end = z_min + (z_max - z_min) * params['trim']
    current_z = z_min + params['z_start']

    raw_profiles = []
    while current_z <= z_end + 1e-6:
        ratio = (current_z - z_min) / (z_max - z_min) if z_max > z_min else 0
        step = params['fine'] if (ratio < ADAPTIVE_LOW_RATIO or ratio > ADAPTIVE_HIGH_RATIO) else params['coarse']
        
        try:
            sec = mesh.section(plane_origin=[0, 0, current_z], plane_normal=[0, 0, 1])
            if sec and sec.discrete:
                longest = max(sec.discrete, key=len)[:, :2]
                if len(longest) >= 3:
                    resampled = resample_contour_smart(longest, params['spline'])
                    raw_profiles.append({
                        "z_cm": round(current_z / 10.0, 4),
                        "points_cm": [[p[0]/10.0, p[1]/10.0] for p in resampled]
                    })
        except: pass
        current_z += step

    if vol_factor < 1.0: raw_profiles = apply_local_volume_reduction(raw_profiles, vol_factor)
    final_profiles = sequential_align_profiles(raw_profiles)

    with open(prof_path, "w", encoding="utf-8") as f:
        json.dump({"meta": {"n_profiles": len(final_profiles)}, "profiles": final_profiles}, f, indent=2)
    return len(final_profiles)

# ════════════════════════════════════════════════════════════
# UI CLASS
# ════════════════════════════════════════════════════════════
class ProSocketDashboard:
    def __init__(self, root):
        self.root = root
        self.root.title("ProSocket App")
        self.root.geometry("620x720")
        self.root.configure(bg="#f4f6f9")
        
        self.filepath = tk.StringVar()
        self.output_root = tk.StringVar(value=DEFAULT_OUTPUT_ROOT)
        self.raw_mesh = None
        
        self.tension = tk.IntVar(value=5)
        self.step_fine = tk.DoubleVar(value=3.0)
        self.step_coarse = tk.DoubleVar(value=15.0)
        self.n_spline = tk.IntVar(value=32)
        self.trim_ratio = tk.DoubleVar(value=0.85)
        self.z_start_mm = tk.DoubleVar(value=15.0)
        self.socket_thickness = tk.DoubleVar(value=2.5) 
        
        self.target_faces = tk.IntVar(value=50000)
        
        self.face_count_raw = tk.StringVar(value="-")
        self.face_count_out = tk.StringVar(value="-")
        self.watertight_status = tk.StringVar(value="-")

        self._build_ui()

    def _build_ui(self):
        tk.Label(self.root, text="CLINICAL DASHBOARD", font=("Helvetica", 14, "bold"), fg="white", bg="#2c3e50", pady=10).pack(fill=tk.X)
        nb = ttk.Notebook(self.root)
        nb.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        t1, t2 = tk.Frame(nb, bg="#f4f6f9"), tk.Frame(nb, bg="#f4f6f9")
        nb.add(t1, text="1. Clinical Scan & Slicing"); nb.add(t2, text="2. Decimation & Output")

        # Tab 1
        frm = tk.LabelFrame(t1, text=" Mesh (STL/OBJ) ", font=("Arial", 10, "bold"), bg="#f4f6f9", padx=10, pady=5)
        frm.pack(fill=tk.X, padx=10, pady=5)
        tk.Button(frm, text="Tải File Scan 3D", command=self.load_file, bg="#34495e", fg="white", font=("Arial", 10, "bold")).pack(fill=tk.X, pady=5)
        self.st_lbl = tk.Label(frm, text="Sẵn sàng.", bg="#f4f6f9", fg="#7f8c8d"); self.st_lbl.pack(anchor="w")

        slc = tk.LabelFrame(t1, text=" Cấu hình Cắt lớp & Vỏ (Manual Setup) ", font=("Arial", 10, "bold"), bg="#f4f6f9", padx=10, pady=10)
        slc.pack(fill=tk.X, padx=10, pady=5)
        
        # Đổi thành khung nhập liệu (Entry)
        self._input_row(slc, "Khoảng cách cắt 2 đầu mỏm (mm):", self.step_fine)
        self._input_row(slc, "Khoảng cách cắt thân giữa (mm):", self.step_coarse)
        self._input_row(slc, "Bỏ qua rác dưới đáy (Z-Start mm):", self.z_start_mm)
        self._input_row(slc, "Tỉ lệ cắt đến đỉnh (0.1 - 0.95):", self.trim_ratio)
        self._input_row(slc, "Độ dày vỏ nhựa in 3D (mm):", self.socket_thickness)
        
        # Số điểm chu vi vẫn là Combobox
        pt_row = tk.Frame(slc, bg="#f4f6f9")
        pt_row.pack(fill=tk.X, pady=6)
        tk.Label(pt_row, text="Số lượng điểm trên 1 chu vi:", width=30, anchor="w", font=("Helvetica", 9), bg="#f4f6f9").pack(side=tk.LEFT)
        ttk.Combobox(pt_row, textvariable=self.n_spline, values=[24, 32, 48, 64], state="readonly", width=8).pack(side=tk.RIGHT, padx=5)

        vr = tk.Frame(t1, bg="#f4f6f9"); vr.pack(fill=tk.X, padx=20, pady=15)
        tk.Label(vr, text="Độ ép thu nhỏ thể tích (%):", bg="#f4f6f9", font=("Arial", 10, "bold"), fg="#c0392b").pack(side=tk.LEFT)
        ttk.Combobox(vr, textvariable=self.tension, values=[0, 3, 5, 8, 10, 15], width=5).pack(side=tk.RIGHT, padx=5)

        # Tab 2
        info = tk.LabelFrame(t2, text=" Thống kê Mesh ", font=("Arial", 10, "bold"), bg="#f4f6f9", padx=10, pady=5)
        info.pack(fill=tk.X, padx=10, pady=5)
        self._info_row(info, "Faces gốc:", self.face_count_raw)
        self._info_row(info, "Faces sau Decimate:", self.face_count_out)
        self._info_row(info, "Watertight:", self.watertight_status)

        ctrl = tk.LabelFrame(t2, text=" Giảm điểm lưới (Decimation) ", font=("Arial", 10, "bold"), bg="#f4f6f9", padx=10, pady=10)
        ctrl.pack(fill=tk.X, padx=10, pady=5)
        self._input_row(ctrl, "Mục tiêu số mặt lưới (Faces):", self.target_faces)
        # Lời cảnh báo đỏ
        tk.Label(ctrl, text="* Cảnh báo: Có thể làm nặng máy hoặc văng Fusion 360 nếu để > 80000 mặt.", fg="#c0392b", bg="#f4f6f9", font=("Arial", 8, "italic")).pack(anchor="w", pady=(5, 0))

        of = tk.LabelFrame(t2, text=" Thư mục Lưu Output ", font=("Arial", 10, "bold"), bg="#f4f6f9", padx=10, pady=10)
        of.pack(fill=tk.X, padx=10, pady=5)
        ttk.Entry(of, textvariable=self.output_root).pack(side=tk.LEFT, expand=True, fill=tk.X)
        tk.Button(of, text="...", command=lambda: self.output_root.set(filedialog.askdirectory() or self.output_root.get())).pack(side=tk.RIGHT)

        tk.Button(self.root, text="> PROCESS & EXPORT", command=self.export, bg="#27ae60", fg="white", font=("Arial", 12, "bold"), pady=10).pack(fill=tk.X, padx=20, pady=15)

    def _input_row(self, parent, label, var):
        r = tk.Frame(parent, bg="#f4f6f9"); r.pack(fill=tk.X, pady=4)
        tk.Label(r, text=label, width=30, anchor="w", font=("Helvetica", 9), bg="#f4f6f9").pack(side=tk.LEFT)
        ttk.Entry(r, textvariable=var, width=10, font=("Helvetica", 9, "bold")).pack(side=tk.RIGHT, padx=5)

    def _info_row(self, parent, label, var):
        r = tk.Frame(parent, bg="#f4f6f9"); r.pack(fill=tk.X, pady=2)
        tk.Label(r, text=label, width=22, anchor="w", bg="#f4f6f9").pack(side=tk.LEFT)
        tk.Label(r, textvariable=var, font=("Helvetica", 9, "bold"), fg="#2980b9", bg="#f4f6f9").pack(side=tk.RIGHT)

    def load_file(self):
        fp = filedialog.askopenfilename(filetypes=[("Mesh", "*.stl *.obj *.ply")])
        if not fp: return
        self.filepath.set(fp)
        self.st_lbl.config(text="Đang tải file...", fg="#e67e22"); self.root.update()
        try:
            self.raw_mesh = trimesh.load(fp, force='mesh')
            self.face_count_raw.set(f"{len(self.raw_mesh.faces):,}")
            self.st_lbl.config(text="Đã load file thành công.", fg="#27ae60")
        except Exception as e: 
            self.st_lbl.config(text=f"Lỗi: {e}", fg="red")

    def export(self):
        if not self.raw_mesh: return messagebox.showwarning("Lỗi", "Chưa load file!")
        self.st_lbl.config(text="Đang xử lý...", fg="#e67e22"); self.root.update()
        try:
            processed = full_mesh_pipeline(self.raw_mesh.copy(), self.target_faces.get())
            self.face_count_out.set(f"{len(processed.faces):,}")
            self.watertight_status.set("Yes" if processed.is_watertight else "No")
            
            processed = perform_pca_alignment(processed)

            os.makedirs(self.output_root.get(), exist_ok=True)
            bn = os.path.splitext(os.path.basename(self.filepath.get()))[0]
            
            i = 1
            while os.path.exists(os.path.join(self.output_root.get(), f"Processed_{bn}_{i}.stl")): i += 1
            base_out = os.path.join(self.output_root.get(), f"Processed_{bn}_{i}")
            
            f_stl = base_out + ".stl"
            f_prof = base_out + "_profiles.json"
            f_data = base_out + "_data.json"
            
            processed.export(f_stl)

            params = {
                'fine': self.step_fine.get(), 
                'coarse': self.step_coarse.get(), 
                'spline': self.n_spline.get(), 
                'trim': self.trim_ratio.get(), 
                'z_start': self.z_start_mm.get()
            }
            vol = round(1.0 - self.tension.get()/100.0, 4)
            n_prof = compute_and_export_profiles(processed, f_prof, vol, params)

            with open(f_data, "w", encoding="utf-8") as f:
                json.dump({
                    "mesh_path": f_stl.replace("\\","/"), 
                    "profiles_path": f_prof.replace("\\","/"), 
                    "socket_thickness": self.socket_thickness.get()
                }, f)

            self.st_lbl.config(text=f"Export xong: Lần {i}", fg="#27ae60")
            messagebox.showinfo("Thành công", f"Đã sinh {n_prof} mặt cắt.\nĐộ dày vỏ thiết lập: {self.socket_thickness.get()}mm.\nMở Fusion 360 chạy Add-in.")
        except Exception as e:
            self.st_lbl.config(text=f"Lỗi: {e}", fg="red"); messagebox.showerror("Lỗi Export", str(e))

if __name__ == "__main__":
    root_win = tk.Tk()
    ProSocketDashboard(root_win)
    root_win.mainloop()
import adsk.core, adsk.fusion, traceback, os, json, glob

MAX_FACES_BEFORE_SPLIT = 80   
SCALE_FACTOR = 10.0 

def run(context):
    app = None
    ui  = None
    try:
        app = adsk.core.Application.get()
        ui  = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox('Vui lòng mở một thiết kế (Design) trước khi chạy.', 'Lỗi')
            return
            
        root = design.rootComponent

        # 1. TÌM FILE DATA
        json_path = _find_latest_json()
        if not json_path:
            ui.messageBox('Không tìm thấy file JSON nào. Hãy chạy Process & Export trước.', 'Lỗi Dữ Liệu')
            return
            
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        profiles_path = data.get('profiles_path', '')
        thickness_mm  = float(data.get('socket_thickness', 4.0))

        if not os.path.exists(profiles_path):
            ui.messageBox('Không tìm thấy file Profiles.', 'Lỗi Dữ Liệu')
            return

        with open(profiles_path, 'r', encoding='utf-8') as f:
            prof_data = json.load(f)

        profiles_list = prof_data.get('profiles', [])
        if len(profiles_list) < 2:
            return

        # 2. THIẾT LẬP DIRECT MODE
        design.designType = adsk.fusion.DesignTypes.DirectDesignType

        new_comp = root
        sketches = new_comp.sketches
        planes   = new_comp.constructionPlanes
        xy_plane = root.xYConstructionPlane

        loft_feats = new_comp.features.loftFeatures
        loft_input = loft_feats.createInput(adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        loft_input.isSolid = False

        # 3. VẼ SPLINE
        for prof_entry in profiles_list:
            z_val  = float(prof_entry['z_cm']) * SCALE_FACTOR
            pts_cm = prof_entry['points_cm']
            
            plane_input = planes.createInput()
            plane_input.setByOffset(xy_plane, adsk.core.ValueInput.createByReal(z_val))
            plane  = planes.add(plane_input)
            
            sketch = sketches.add(plane)
            sketch.isComputeDeferred = True

            spline_pts = adsk.core.ObjectCollection.create()
            for pt in pts_cm: 
                spline_pts.add(adsk.core.Point3D.create(pt[0] * SCALE_FACTOR, pt[1] * SCALE_FACTOR, 0.0))
            
            if spline_pts.count >= 3:
                spline = sketch.sketchCurves.sketchFittedSplines.add(spline_pts)
                spline.isClosed = True
                
            sketch.isComputeDeferred = False
            
            if sketch.profiles.count > 0:
                prof = max((sketch.profiles.item(i) for i in range(sketch.profiles.count)), key=lambda p: (p.boundingBox.maxPoint.x - p.boundingBox.minPoint.x) * (p.boundingBox.maxPoint.y - p.boundingBox.minPoint.y))
                loft_input.loftSections.add(prof)

        # 4. DỆT MÀNG (LOFT)
        loft_feat    = loft_feats.add(loft_input)
        surface_body = loft_feat.bodies.item(0)

        # 5. ĐÙN VỎ (THICKEN)
        if surface_body.faces.count > MAX_FACES_BEFORE_SPLIT:
            final_body = _thicken_by_patches(new_comp, surface_body, thickness_mm)
        else:
            final_body = _thicken_full(new_comp, surface_body, thickness_mm)

        if final_body: 
            final_body.name = f"ProSocket Shell ({thickness_mm}mm)"
            ui.messageBox(f"✅ DỰNG VỎ THÀNH CÔNG!\nĐộ dày vỏ: {thickness_mm} mm")
            
            for b in root.bRepBodies:
                if b.isVisible and b.isSolid and b != final_body and b != surface_body:
                    b.isVisible = False

    except Exception as e:
        if ui: 
            ui.messageBox(f'Lỗi:\n{e}\n\n{traceback.format_exc()}', 'Lỗi Script')

def _find_latest_json() -> str:
    search_path = "D:/STEP/Processed_mesh/*_data.json"
    files = glob.glob(search_path)
    if not files: return None
    files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    return files[0]

def _thicken_full(comp, surface_body, thickness_mm: float):
    try:
        surfaces = adsk.core.ObjectCollection.create()
        for face in surface_body.faces: 
            surfaces.add(face)
            
        tf   = comp.features.thickenFeatures
        tval = adsk.core.ValueInput.createByString(f"{thickness_mm} mm") 
        
        ti   = tf.createInput(surfaces, tval, False, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        feat = tf.add(ti)
        return feat.bodies.item(0) if feat.bodies.count > 0 else None
    except: 
        return None

def _thicken_by_patches(comp, surface_body, thickness_mm: float):
    try:
        all_faces  = list(surface_body.faces)
        patch_size = MAX_FACES_BEFORE_SPLIT
        result_bodies = []

        for i in range(0, len(all_faces), patch_size):
            patch_faces = all_faces[i: i + patch_size]
            faces_coll  = adsk.core.ObjectCollection.create()
            for face in patch_faces: 
                faces_coll.add(face)

            tf   = comp.features.thickenFeatures
            tval = adsk.core.ValueInput.createByString(f"{thickness_mm} mm")
            
            ti   = tf.createInput(faces_coll, tval, False, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
            try:
                feat = tf.add(ti)
                if feat.bodies.count > 0: 
                    result_bodies.append(feat.bodies.item(0))
            except: 
                pass
            adsk.doEvents()

        if not result_bodies: return None
        if len(result_bodies) == 1: return result_bodies[0]

        combine_feats = comp.features.combineFeatures
        base_body     = result_bodies[0]
        tool_coll     = adsk.core.ObjectCollection.create()
        for b in result_bodies[1:]: 
            tool_coll.add(b)

        ci = combine_feats.createInput(base_body, tool_coll)
        ci.operation = adsk.fusion.FeatureOperations.JoinFeatureOperation
        ci.isKeepToolBodies = False
        combine_feats.add(ci)
        return base_body
    except:
        return _thicken_full(comp, surface_body, thickness_mm)

def stop(context):
    pass
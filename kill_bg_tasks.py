import subprocess
import os
import json

def kill_background_tasks():
    print("🔍 Đang tìm và dọn dẹp các luồng Face AI / Adafruit chạy ngầm...")
    try:
        # Sử dụng PowerShell để lấy danh sách các tiến trình Python và CommandLine của chúng
        ps_cmd = 'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name like \'%python%\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"'
        output = subprocess.check_output(ps_cmd, shell=True, text=True).strip()
        
        if not output:
            print("✅ Không có tiến trình Python nào đang chạy.")
            return

        processes = json.loads(output)
        
        # Đảm bảo processes luôn là dạng list (trường hợp chỉ có 1 tiến trình thì ConvertTo-Json trả về dict)
        if isinstance(processes, dict):
            processes = [processes]
            
        killed_count = 0
        current_pid = str(os.getpid())
        
        for p in processes:
            pid = p.get("ProcessId")
            cmdline = p.get("CommandLine")
            
            if not cmdline or not pid: 
                continue
                
            # Kiểm tra xem tiến trình có chứa tên file hệ thống của chúng ta không
            if "face_recognition_service.py" in cmdline or "adafruit_to_db.py" in cmdline:
                if str(pid) == current_pid:
                    continue # Bỏ qua chính file kill_bg_tasks.py này
                    
                print(f"🛑 Đang tắt tiến trình PID {pid}: {cmdline}")
                # Ép buộc tắt tiến trình
                subprocess.run(['taskkill', '/PID', str(pid), '/F'], capture_output=True)
                killed_count += 1
                
        if killed_count == 0:
            print("✅ Hệ thống sạch sẽ. Không có luồng ngầm nào bị kẹt.")
        else:
            print(f"✅ Đã dọn dẹp thành công {killed_count} luồng ngầm.")
            
    except Exception as e:
        print(f"❌ Có lỗi xảy ra trong quá trình quét: {e}")
        print("💡 Thử mở Terminal dưới quyền Administrator nếu bạn bị từ chối truy cập.")

if __name__ == "__main__":
    kill_background_tasks()

# Zhihugen API

Base URL:

```text
http://localhost:8010
```

## Render With Uploads

Creates a render job from uploaded images. This endpoint returns immediately.

```http
POST /api/zhihugen/render/upload
Content-Type: multipart/form-data
```

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `images` | file[] | yes | Repeat once per scene. |
| `audioScripts` | string[] | yes | Repeat in the same order as images. |
| `videoTitle` | string | no | Used for output filename. |
| `outputDirectory` | string | no | Absolute path. Uses default if omitted. |
| `backgroundVideoDirectory` | string | no | Absolute path. Uses default if omitted. |
| `ttsModel` | string | no | Uses default if omitted. |
| `resolution` | string | no | Example: `1080x1920`. |
| `fps` | int | no | Example: `30`. |
| `imageFit` | `contain` or `cover` | no | Default comes from settings. |
| `subtitle` | bool | no | `true` or `false`. |

Example:

```bash
curl -X POST http://localhost:8010/api/zhihugen/render/upload \
  -F "videoTitle=Test2" \
  -F "images=@C:/path/to/scene1.png" \
  -F "audioScripts=Audio script for scene 1"
```

Multiple scenes:

```bash
curl -X POST http://localhost:8010/api/zhihugen/render/upload \
  -F "videoTitle=My Video" \
  -F "images=@C:/path/to/scene1.png" \
  -F "audioScripts=Script for scene 1" \
  -F "images=@C:/path/to/scene2.png" \
  -F "audioScripts=Script for scene 2"
```

Immediate response:

```json
{
  "jobId": "job_20260526_162032_253284",
  "status": "pending",
  "videoFileName": "test2"
}
```

Filename behavior:

```text
Title: Test2
Output: test2.mp4
If exists: test2(1).mp4, test2(2).mp4, ...
```

## Render From Existing Paths

Creates a render job using image paths already available on the server machine.

```http
POST /api/zhihugen/render
Content-Type: application/json
```

```json
{
  "images": [
    "C:\\path\\to\\scene1.png",
    "C:\\path\\to\\scene2.png"
  ],
  "audioScripts": [
    "Script for scene 1",
    "Script for scene 2"
  ],
  "outputDirectory": "C:\\Users\\TaiChuVan\\OneDriveNASHTECH\\Desktop\\Videos\\ZhihuGen",
  "backgroundVideoDirectory": "C:\\Users\\TaiChuVan\\OneDriveNASHTECH\\Desktop\\Videos\\9x16",
  "videoTitle": "My Video",
  "options": {
    "ttsModel": "edge-tts/vi-VN-HoaiMyNeural",
    "resolution": "1080x1920",
    "fps": 30,
    "imageFit": "contain",
    "subtitle": false
  }
}
```

Immediate response:

```json
{
  "jobId": "job_20260526_162032_253284",
  "status": "pending",
  "videoFileName": "my_video"
}
```

## Jobs

List all jobs:

```bash
curl http://localhost:8010/api/zhihugen/jobs
```

Get current job details without waiting:

```bash
curl http://localhost:8010/api/zhihugen/jobs/{jobId}
```

Wait for job completion:

```bash
curl http://localhost:8010/api/zhihugen/jobs/{jobId}/wait
```

`/wait` returns immediately if the job is already `completed` or `failed`. If the job is still pending, it keeps the request open until the job finishes, with a 1 hour timeout.

Completed response:

```json
{
  "jobId": "job_20260526_162032_253284",
  "status": "completed",
  "outputVideoPath": "C:\\Users\\TaiChuVan\\OneDriveNASHTECH\\Desktop\\Videos\\ZhihuGen\\test2.mp4",
  "durationSeconds": 1.3,
  "sceneCount": 1,
  "videoTitle": "Test2",
  "videoFileName": "test2"
}
```

Failed response:

```json
{
  "jobId": "job_20260526_162032_253284",
  "status": "failed",
  "error": "Error message",
  "videoTitle": "Test2",
  "videoFileName": "test2"
}
```

Timeout response:

```json
{
  "error": {
    "code": "TIMEOUT",
    "message": "Job did not complete within 1 hour"
  }
}
```

## Feature Settings

Get effective Zhihugen settings:

```bash
curl http://localhost:8010/api/features/zhihugen/settings
```

Save overrides:

```bash
curl -X POST http://localhost:8010/api/features/zhihugen/settings \
  -H "Content-Type: application/json" \
  -d "{\"defaultSubtitle\":false,\"defaultFps\":30}"
```

Overridable keys:

```text
defaultBackgroundVideoDirectory
defaultFps
defaultImageFit
defaultOutputDirectory
defaultResolution
defaultSubtitle
defaultTtsModel
```

## TTS Models

List models:

```bash
curl http://localhost:8010/api/tts/models
```

Add a model:

```bash
curl -X POST http://localhost:8010/api/tts/models \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"edge-tts/vi-VN-HoaiMyNeural\",\"name\":\"Vietnamese Female - Hoai My\",\"provider\":\"edge-tts\",\"enabled\":true}"
```

Set default model:

```bash
curl -X PUT http://localhost:8010/api/tts/models/default \
  -H "Content-Type: application/json" \
  -d "{\"modelId\":\"edge-tts/vi-VN-HoaiMyNeural\"}"
```

Delete a model:

```bash
curl -X DELETE "http://localhost:8010/api/tts/models/edge-tts%2Fvi-VN-HoaiMyNeural"
```

The current default model cannot be deleted.

## Server Scripts

Start server:

```bat
zhihugen\start-server.bat
```

Start with reload:

```bat
zhihugen\reload-server.bat
```

Stop server:

```bat
zhihugen\stop-server.bat
```

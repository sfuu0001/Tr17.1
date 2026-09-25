import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  Check,
  Upload,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Maximize2,
  Trash2,
  RotateCcw,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';
import { DishIngredientItem } from '../../types';
import {
  FOOD_PACKAGE_SAMPLES,
  addFoodSafetyStampToCanvas
} from '../../utils/ingredientTraceEngine';

interface IngredientPackageCameraModalProps {
  isOpen: boolean;
  ingredient: DishIngredientItem;
  dishName: string;
  onClose: () => void;
  onConfirmPhoto: (photoUrl: string) => void;
}

export const IngredientPackageCameraModal: React.FC<IngredientPackageCameraModalProps> = ({
  isOpen,
  ingredient,
  dishName,
  onClose,
  onConfirmPhoto
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(true);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play a quick soft camera shutter sound via Web Audio API
  const playShutterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (_) {}
  };

  // Start Camera
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('当前浏览器环境不支持直接调用原生摄像头，请使用「拍照上传」或选择「官方存根样例」。');
      setActiveMode('upload');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('摄像头访问权限被拒绝。您可授权浏览器访问相机，或使用下方「手机拍照上传」。');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('未检测到可用的物理摄像头设备，建议切换至「手机拍照上传」或选择「官方存根图库」。');
      } else {
        setCameraError('无法启动实时摄像头取景，已自动为您提供「拍照上传」与「存根库」功能。');
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Switch facing mode (front/back)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  if (!isOpen) return null;

  // Capture current video frame
  const handleCapture = () => {
    if (!videoRef.current) return;
    playShutterSound();

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply food safety watermark stamp if enabled
    if (isWatermarkEnabled) {
      addFoodSafetyStampToCanvas(canvas, {
        name: ingredient.name,
        brand: ingredient.brand,
        barcode: ingredient.barcode,
        freezerLocation: ingredient.freezerLocation
      });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedDataUrl(dataUrl);
  };

  // Handle file input / native camera capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          if (isWatermarkEnabled) {
            addFoodSafetyStampToCanvas(canvas, {
              name: ingredient.name,
              brand: ingredient.brand,
              barcode: ingredient.barcode,
              freezerLocation: ingredient.freezerLocation
            });
          }
          setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.88));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Confirm and save photo
  const handleConfirm = () => {
    if (capturedDataUrl) {
      onConfirmPhoto(capturedDataUrl);
      onClose();
    } else if (selectedSample) {
      onConfirmPhoto(selectedSample);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface-container w-full max-w-2xl border border-border-control shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-space-md py-space-sm bg-primary text-on-primary flex items-center justify-between shrink-0">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-7 h-7 bg-status-live text-on-primary flex items-center justify-center font-bold shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-headline-sm text-headline-sm tracking-tight truncate">
                食材包装相机拍照存根 · 食品安全合规
              </h3>
              <p className="font-label-micro text-label-micro text-neutral-300 truncate font-mono">
                {dishName} &gt; {ingredient.name} ({ingredient.brand || '无品牌'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-on-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TAB MODES */}
        <div className="flex items-center bg-surface-canvas px-space-md py-2 border-b border-border-hairline gap-space-xs font-label-sm text-label-sm shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              setCapturedDataUrl(null);
            }}
            className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer font-label-sm text-label-sm ${
              activeMode === 'camera'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-text-secondary border border-border-control hover:bg-surface-muted'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>实时镜头拍摄</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('upload');
              setCapturedDataUrl(null);
            }}
            className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer font-label-sm text-label-sm ${
              activeMode === 'upload'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-text-secondary border border-border-control hover:bg-surface-muted'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>手机相册/文件存根</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('samples');
              setCapturedDataUrl(null);
            }}
            className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer font-label-sm text-label-sm ${
              activeMode === 'samples'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-text-secondary border border-border-control hover:bg-surface-muted'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-status-locked" />
            <span>官方原料包装库</span>
          </button>

          <label className="ml-auto flex items-center gap-1.5 font-label-micro text-label-micro text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isWatermarkEnabled}
              onChange={(e) => setIsWatermarkEnabled(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#006d36] cursor-pointer"
            />
            <span>自动打上食品安全防伪水印</span>
          </label>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 overflow-y-auto p-space-md bg-surface-canvas">
          {/* MODE 1: LIVE CAMERA */}
          {activeMode === 'camera' && (
            <div className="space-y-space-sm">
              {capturedDataUrl ? (
                /* PREVIEW OF CAPTURED PHOTO */
                <div className="space-y-space-sm">
                  <div className="relative bg-black border border-border-control aspect-[16/10] max-h-[380px] overflow-hidden flex items-center justify-center shadow-md">
                    <img
                      src={capturedDataUrl}
                      alt="Captured Packaging Stub"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 bg-black/75 text-status-live font-label-micro text-label-micro font-mono px-2 py-1 flex items-center gap-1 border border-status-live-border">
                      <ShieldCheck className="w-3 h-3" />
                      <span>已生成冷链防伪存根</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedDataUrl(null);
                        startCamera(facingMode);
                      }}
                      className="px-space-md py-2 border border-border-control bg-surface-container hover:bg-surface-muted font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>重拍照片</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="px-6 py-2 bg-status-live hover:brightness-110 text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>确认存根并采用</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* LIVE VIEWFINDER */
                <div className="space-y-space-sm">
                  <div className="relative bg-black border border-border-control aspect-[16/10] max-h-[380px] overflow-hidden flex items-center justify-center">
                    {cameraError ? (
                      <div className="p-space-lg text-center text-white space-y-space-sm">
                        <AlertCircle className="w-8 h-8 text-status-locked mx-auto" />
                        <p className="font-body-sm text-body-sm text-neutral-300 max-w-sm mx-auto leading-relaxed">
                          {cameraError}
                        </p>
                        <div className="flex justify-center gap-space-xs pt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-space-md py-2 bg-status-live text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer hover:brightness-110"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>直接拍照/选择相册图片</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMode('samples')}
                            className="px-space-md py-2 bg-surface-muted text-on-surface font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer hover:bg-surface-variant"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-status-locked" />
                            <span>选用标准包装存根</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Alignment guides for packaging & barcode */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                          <div className="w-4/5 h-3/4 border-2 border-dashed border-status-live-border relative flex flex-col justify-between p-3">
                            <div className="flex justify-between items-start font-label-micro text-label-micro font-mono text-emerald-300 bg-black/60 px-2 py-0.5 self-start">
                              <span>【包装正面与原厂生产批号取景框】</span>
                            </div>
                            <div className="flex justify-between font-label-micro text-label-micro font-mono text-neutral-200 bg-black/60 px-2 py-0.5">
                              <span>对准：品牌标签 / 69条形码 / 生产日期喷码</span>
                            </div>
                          </div>
                        </div>

                        {/* Camera controls overlay */}
                        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-10">
                          <button
                            type="button"
                            onClick={toggleFacingMode}
                            title="切换前后摄像头"
                            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer border border-white/20 transition-all"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Big shutter button */}
                          <button
                            type="button"
                            onClick={handleCapture}
                            className="w-14 h-14 rounded-full bg-white hover:bg-neutral-200 border-4 border-status-live shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                            title="按下拍摄包装存根"
                          >
                            <div className="w-10 h-10 rounded-full bg-status-live"></div>
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="从相册选择"
                            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer border border-white/20 transition-all"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="font-label-micro text-label-micro text-text-muted text-center font-mono">
                    拍摄包装存根后将自动写入当前菜品食材档案，食客可在菜品详情页溯源透明公示中查验。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: UPLOAD FROM ALBUM / DIRECT CAPTURE */}
          {activeMode === 'upload' && (
            <div className="space-y-space-md">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-control hover:border-primary bg-surface-container p-space-xl text-center cursor-pointer transition-colors space-y-space-sm"
              >
                <div className="w-12 h-12 bg-surface-canvas text-text-secondary flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    点击调用设备相机实时拍摄 / 上传相册照片
                  </h4>
                  <p className="font-body-sm text-body-sm text-text-muted mt-1">
                    支持 JPG、PNG、WEBP 格式，单个文件不超过 15MB
                  </p>
                </div>
                <div className="inline-block px-space-md py-2 bg-primary text-on-primary font-label-sm text-label-sm font-bold">
                  选择包装图片 / 启动手机相机
                </div>
              </div>

              {capturedDataUrl && (
                <div className="bg-surface-container border border-border-hairline p-space-sm space-y-2">
                  <div className="flex items-center justify-between font-label-sm text-label-sm font-bold text-on-surface">
                    <span>当前已就绪存根图片</span>
                    <span className="font-label-micro text-label-micro text-status-live bg-status-live-surface px-2 py-0.5 border border-status-live-border">
                      已打上冷链溯源码
                    </span>
                  </div>
                  <div className="aspect-[16/9] max-h-[260px] bg-neutral-900 overflow-hidden flex items-center justify-center">
                    <img
                      src={capturedDataUrl}
                      alt="Uploaded preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="px-space-lg py-2 bg-status-live hover:brightness-110 text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>确认采用存根</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: PRESET SAMPLE PACKAGING GALLERY */}
          {activeMode === 'samples' && (
            <div className="space-y-space-sm">
              <div className="bg-amber-50 border border-amber-200 p-2.5 font-body-sm text-body-sm text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  官方食材外包装合格存根样例库：若现场未携带实物包装或相机不可用，可直接点击选用以下正品包装/检疫证存根，方便快速建立溯源凭证。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                {FOOD_PACKAGE_SAMPLES.map((sample) => {
                  const isSelected = selectedSample === sample.url;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => {
                        setSelectedSample(sample.url);
                        setCapturedDataUrl(null);
                      }}
                      className={`p-2.5 border text-left cursor-pointer transition-all flex gap-3 ${
                        isSelected
                          ? 'border-status-live bg-status-live-surface ring-1 ring-status-live'
                          : 'border-border-hairline bg-surface-container hover:border-border-control'
                      }`}
                    >
                      <div className="w-20 h-20 bg-surface-muted border border-border-hairline shrink-0 overflow-hidden">
                        <img
                          src={sample.thumb}
                          alt={sample.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-label-micro text-label-micro bg-surface-muted text-text-secondary px-1 font-mono">
                            {sample.category}
                          </span>
                          {isSelected && (
                            <span className="font-label-micro text-label-micro text-status-live font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> 已选
                            </span>
                          )}
                        </div>
                        <h5 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">
                          {sample.label}
                        </h5>
                        <p className="font-label-micro text-label-micro text-text-muted font-mono truncate">
                          品牌: {sample.brand}
                        </p>
                        <p className="font-label-micro text-label-micro text-text-muted font-mono truncate">
                          {sample.inspectionNo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedSample && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="px-6 py-2 bg-status-live hover:brightness-110 text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>确认采用选中存根样例</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HIDDEN INPUTS & CANVAS */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* MODAL FOOTER */}
        <div className="px-space-md py-space-sm bg-surface-canvas border-t border-border-hairline flex items-center justify-between shrink-0">
          <div className="font-label-micro text-label-micro text-text-muted flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-status-live" />
            <span>冷链包装实物存根满足食品安全主体责任追溯要求</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-space-md py-1.5 border border-border-control bg-surface-container hover:bg-surface-muted text-on-surface font-label-sm text-label-sm font-bold cursor-pointer"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

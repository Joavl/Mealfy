/**
 * Utilitários de imagem para avatar.
 *
 * A foto de perfil é armazenada como string em `user.avatar`. Ela pode ser:
 *  - uma URL http(s) (avatares vindos do backend / mocks antigos), ou
 *  - um data URL `data:image/...;base64,...` (foto que o próprio usuário enviou).
 */

/** True quando a string é renderizável em <img> (URL http(s) ou data URL). */
export function isImageSrc(v?: string | null): boolean {
  return !!v && /^(https?:|data:image\/)/.test(v);
}

export interface ResizeOptions {
  /** Lado máximo (px) da imagem final. Default 512 — suficiente para avatar. */
  maxSize?: number;
  /** Qualidade JPEG 0..1. Default 0.82. */
  quality?: number;
}

/**
 * Lê um arquivo de imagem, redimensiona (mantendo proporção, recorte central
 * quadrado) e devolve um data URL JPEG compacto — evita estourar o localStorage.
 * Roda 100% no cliente (nenhum upload). Rejeita arquivos que não sejam imagem.
 */
export function fileToAvatarDataUrl(file: File, opts: ResizeOptions = {}): Promise<string> {
  const { maxSize = 512, quality = 0.82 } = opts;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida ou corrompida.'));
      img.onload = () => {
        // Recorte central quadrado + redimensionamento para no máximo maxSize.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const target = Math.min(side, maxSize);

        const canvas = document.createElement('canvas');
        canvas.width = target;
        canvas.height = target;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem neste dispositivo.'));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

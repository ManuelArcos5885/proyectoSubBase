export interface Puerto {
  idPuerto: string;
  nombre: string;
  comunidad: string;
  provincia: string;
  direccion: string;
  lat?: number | null;
  lng?: number | null;
}

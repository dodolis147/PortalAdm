import { createRepository } from '../lib/db-client';
import { Incident } from '../types';

const baseRepo = createRepository<Incident>('incidents');

function safeIncident(incident: Incident): Incident {
  let safePhotoUrls: string[] = [];
  if (Array.isArray(incident.photoUrls)) {
    safePhotoUrls = incident.photoUrls;
  } else if (typeof incident.photoUrls === 'string') {
    try {
      safePhotoUrls = JSON.parse(incident.photoUrls);
      if (!Array.isArray(safePhotoUrls)) {
        safePhotoUrls = [incident.photoUrls];
      }
    } catch (e) {
      safePhotoUrls = [incident.photoUrls]; // fallback to single string in an array
    }
  }

  // Also support the old legacy format just in case
  if (incident.replies && incident.replies.length > 0) {
    const photosReply = incident.replies.find(r => (r as any).isPhotosPayload || r.id === 'sys-photos-' + incident.id);
    if (photosReply) {
      try {
        const parsed = JSON.parse(photosReply.content);
        if (Array.isArray(parsed)) {
          safePhotoUrls = [...safePhotoUrls, ...parsed];
        }
      } catch(e) {}
    }
  }

  const cleanReplies = (incident.replies || []).filter(r => r.id !== 'sys-photos-' + incident.id && !(r as any).isPhotosPayload) || [];

  return {
    ...incident,
    photoUrls: safePhotoUrls,
    replies: cleanReplies
  };
}

export const incidentsRepository = {
  ...baseRepo,
  findAll: async () => {
    const records = await baseRepo.findAll();
    return records.map(safeIncident);
  },
  findById: async (id: string) => {
    const record = await baseRepo.findById(id);
    return record ? safeIncident(record) : null;
  },
  subscribe: (onUpdate: (data: Incident, type: 'INSERT' | 'UPDATE' | 'DELETE') => void) => {
    return baseRepo.subscribe((data, type) => {
      onUpdate(safeIncident(data), type);
    });
  },
  getLocalCache: () => {
    if (baseRepo.getLocalCache) {
      return baseRepo.getLocalCache().map(safeIncident);
    }
    return [];
  }
};

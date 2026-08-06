export const STAGES = [
  { id: 'tesoreria',    label: 'Tesorería' },
  { id: 'contabilidad', label: 'Contabilidad' },
  { id: 'administracion',label: 'Administración' },
  { id: 'archivo_caja', label: 'Archivo de Caja' },
];

export const getActivities = (user) => {
  try {
    const listados = JSON.parse(localStorage.getItem('dashq_notas_pago_v5')) || [];
    const readIds = JSON.parse(localStorage.getItem('dashq_read_notifs_v3')) || [];
    const notifs = [];

    listados.forEach(doc => {
      if (doc.historial && doc.historial.length > 0) {
        
        // Filter by user role
        const isAdmin = user?.role === 'Administrador' || user?.role === 'admin';
        const userRoleLower = (user?.role || '').toLowerCase().trim();
        const stageLabel = (STAGES[doc.stageIndex]?.label || '').toLowerCase().trim();
        const isCurrentTarget = stageLabel === userRoleLower;
        const isParticipant = doc.historial.some(h => 
          (h.usuario || '').toLowerCase().trim() === (user?.name || '').toLowerCase().trim() ||
          (h.etapa || '').toLowerCase().trim() === userRoleLower
        );

        if (!isAdmin && !isCurrentTarget && !isParticipant) return;

        const lastHistory = doc.historial[doc.historial.length - 1];
        const notifId = `notif_${doc.id}_${doc.historial.length}`;
        
        let type = 'info';
        let title = 'Listado de Notas de Pago actualizado';
        let desc = `Se ha actualizado el listado ${doc.numero} en la etapa ${lastHistory.etapa}.`;

        if (doc.estado === 'archivado') {
          type = 'success';
          title = 'Archivado exitosamente';
          desc = `Las Notas de Pago del listado ${doc.numero} han sido archivadas en Caja.`;
        } else if (doc.devuelto) {
          type = 'warning';
          if (isAdmin || isCurrentTarget) {
            title = 'Documento observado';
            desc = `El listado ${doc.numero} fue devuelto a tu área con observaciones.`;
          } else {
            type = 'info';
            title = `Devuelto a ${STAGES[doc.stageIndex]?.label}`;
            desc = `El listado ${doc.numero} ha sido devuelto con observaciones.`;
          }
        } else if (doc.stageIndex > 0) {
          // If it's passed tesoreria and not archived/returned, it needs approval from someone
          if (isAdmin || isCurrentTarget) {
            type = 'action_required';
            title = `Pendiente en ${STAGES[doc.stageIndex]?.label || 'revisión'}`;
            desc = `Se requiere Visto Bueno para el listado ${doc.numero}.`;
          } else {
            type = 'info';
            title = `Enviado a ${STAGES[doc.stageIndex]?.label || 'revisión'}`;
            desc = `El listado ${doc.numero} está en proceso de revisión.`;
          }
        }

        notifs.push({
          id: notifId,
          docId: doc.id,
          stageIndex: doc.stageIndex,
          title: title,
          description: desc,
          date: lastHistory.fecha,
          type: type,
          read: readIds.includes(notifId),
          sender: lastHistory.etapa,
          docRef: doc.numero,
          isPendingForMe: (isAdmin || isCurrentTarget) && (type === 'action_required' || type === 'warning'),
          history: [...doc.historial].reverse().map((h, i) => ({
            id: `h_${doc.id}_${i}`,
            action: h.accion,
            user: h.usuario,
            date: h.fecha,
            obs: h.obs || ''
          })),
          notasDePago: doc.notasDePago || []
        });
      }
    });

    notifs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return notifs;
  } catch (e) {
    return [];
  }
};

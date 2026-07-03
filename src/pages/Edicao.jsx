import ClientFolderManager from '../components/ClientFolderManager';
import DepartmentPipeline from '../components/DepartmentPipeline';
import DepartmentGuide from '../components/DepartmentGuide';
import GoogleDriveConnector from '../components/GoogleDriveConnector';
import MeetingScheduler from '../components/MeetingScheduler';

const Edicao = () => {
  return (
    <ClientFolderManager title="Departamento de Edição" description="Edição e Finalização de Vídeos.">
      {(client) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <DepartmentGuide department="Edição" />
            <GoogleDriveConnector client={client} department="Edição" />
          </div>

          <DepartmentPipeline client={client} departmentName="Edição" />
          <MeetingScheduler client={client} department="Edição" />
        </div>
      )}
    </ClientFolderManager>
  );
};
export default Edicao;

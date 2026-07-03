import ClientFolderManager from '../components/ClientFolderManager';
import DepartmentPipeline from '../components/DepartmentPipeline';
import DepartmentGuide from '../components/DepartmentGuide';
import GoogleDriveConnector from '../components/GoogleDriveConnector';
import MeetingScheduler from '../components/MeetingScheduler';

const Design = () => {
  return (
    <ClientFolderManager title="Departamento de Design" description="Criação de Capas, Carrosséis e Identidade Visual.">
      {(client) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <DepartmentGuide department="Design" />
            <GoogleDriveConnector client={client} department="Design" />
          </div>

          <DepartmentPipeline client={client} departmentName="Design" />
          <MeetingScheduler client={client} department="Design" />
        </div>
      )}
    </ClientFolderManager>
  );
};
export default Design;

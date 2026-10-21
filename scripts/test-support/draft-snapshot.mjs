// GitHub's response shape, independent of the client's normalization code.
export function draftSnapshot({repository,main,head,pr,files,checked=true,previewTarget}){
 return {data:{repository:{viewerPermission:repository.permissions?.push===true?'WRITE':repository.permissions?.push===false?'READ':null,ref:{target:{oid:main}},pullRequest:{
  state:pr.merged?'MERGED':pr.state.toUpperCase(),merged:pr.merged===true,mergeCommit:pr.merged?{oid:pr.merge_commit_sha}:null,
  headRefName:pr.head.ref,headRefOid:head,baseRefName:pr.base.ref,headRepository:{nameWithOwner:pr.head.repo.full_name},changedFiles:pr.changed_files,
  files:{nodes:files.map(row=>({path:row.filename,changeType:row.status.toUpperCase()})),pageInfo:{hasNextPage:false}},
  history:{nodes:[{commit:{oid:head,parents:{nodes:[{oid:'a'.repeat(40)}],pageInfo:{hasNextPage:false}}}}],pageInfo:{hasNextPage:false}},
  latest:{nodes:[{commit:{oid:head,statusCheckRollup:{contexts:{nodes:checked?[
   {__typename:'StatusContext',context:'albion/deploy-preview',state:'SUCCESS',targetUrl:previewTarget,createdAt:'2026-10-21T10:00:00Z'},
   {__typename:'CheckRun',name:'Validate Songs page',status:'COMPLETED',conclusion:'SUCCESS',startedAt:'2026-10-21T10:00:00Z',completedAt:'2026-10-21T10:01:00Z'},
  ]:[],pageInfo:{hasNextPage:false}}}}}]},
 }}}};
}

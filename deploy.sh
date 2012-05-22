pushd server
  npm install
popd

pushd bin
  npm install
popd

pushd browser
  ./build.sh
popd
